using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryService.Data;
using InventoryService.Models;
using InventoryService.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace InventoryService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Cloudinary _cloudinary;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IHubContext<InventoryHub> _inventoryHubContext;

        public InventoryController(AppDbContext context, Cloudinary cloudinary, 
            IHubContext<NotificationHub> hubContext, IHubContext<InventoryHub> inventoryHubContext)
        {
            _context = context;
            _cloudinary = cloudinary;
            _hubContext = hubContext;
            _inventoryHubContext = inventoryHubContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Product>>> GetProducts()
        {
            return await _context.Products.ToListAsync();
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Product>> GetProductById(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            return product;
        }

        [HttpGet("byname/{name}")]
        public async Task<ActionResult<Product>> GetProductByName(string name)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Name == name);
            if (product == null)
                return NotFound();

            return product;
        }

        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct([FromForm] ProductUploadDto dto)
        {
            if (dto == null)
                return BadRequest("Invalid request payload.");

            if (dto.Image == null || dto.Image.Length == 0)
                return BadRequest("Image file is required.");

            var exists = await _context.Products
                .AnyAsync(p => p.Name.ToLower() == dto.Name.ToLower());
            if (exists) return Conflict(new { message = "Product with this name already exists." });

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(dto.Image.FileName, dto.Image.OpenReadStream())
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult == null || uploadResult.Error != null)
                return StatusCode(500, $"Image upload failed: {uploadResult?.Error?.Message}");

            var product = new Product
            {
                Name = dto.Name,
                Price = dto.Price,
                Qty = dto.Qty,
                status = dto.Qty > 0,
                Uri = uploadResult.SecureUrl?.ToString() ?? string.Empty,
                PublicId = uploadResult.PublicId ?? string.Empty
            };

            _context.Products.Add(product);
            
            // Save to database FIRST
            await _context.SaveChangesAsync();
            
            // THEN send notifications
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", $"New Product '{product.Name}' has been Added");
            await _inventoryHubContext.Clients.All.SendAsync("InventoryUpdated", "Product added", product);
            
            return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] ProductUploadDto dto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            // Store old name for notification
            var oldName = product.Name;
            
            product.Name = dto.Name;
            product.Price = dto.Price;
            product.Qty = dto.Qty;
            product.status = dto.Qty > 0;

            if (dto.Image != null)
            {
                if (!string.IsNullOrEmpty(product.PublicId))
                {
                    await _cloudinary.DestroyAsync(new DeletionParams(product.PublicId));
                }

                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(dto.Image.FileName, dto.Image.OpenReadStream())
                };
                var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                product.Uri = uploadResult.SecureUrl.ToString();
                product.PublicId = uploadResult.PublicId;
            }

            await _context.SaveChangesAsync();
            
            var notificationMessage = oldName != product.Name 
                ? $"Product '{oldName}' updated to '{product.Name}'" 
                : $"Product '{product.Name}' has been Updated";
                
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notificationMessage);
            await _inventoryHubContext.Clients.All.SendAsync("InventoryUpdated", "Product updated", product);
            
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            var productInfo = new { product.Id, product.Name };
            
            if (!string.IsNullOrEmpty(product.PublicId))
            {
                await _cloudinary.DestroyAsync(new DeletionParams(product.PublicId));
            }

            _context.Products.Remove(product);
            
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", $"Product '{productInfo.Name}' has been Deleted");
            await _inventoryHubContext.Clients.All.SendAsync("InventoryUpdated", "Product deleted", productInfo);
            
            return NoContent();
        }
        
        [HttpPatch("{id:int}/adjust-qty")]
        public async Task<IActionResult> AdjustQuantity(int id, [FromQuery] int delta)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            if (delta < 0 && product.Qty + delta < 0)
                return BadRequest(new { message = "Insufficient stock." });

            product.Qty += delta;
            product.status = product.Qty > 0;
            
            await _context.SaveChangesAsync();
            
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", $"Product '{product.Name}' has New Qty: {product.Qty}");
            await _inventoryHubContext.Clients.All.SendAsync("InventoryUpdated", "Product quantity adjusted", 
                new { product.Id, product.Name, product.Qty, product.status });
            
            return Ok(new { product.Id, product.Name, product.Qty, product.status });
        }
    }
}