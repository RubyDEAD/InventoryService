using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryService.Data;
using InventoryService.Models;

namespace InventoryService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Cloudinary _cloudinary;

        public InventoryController(AppDbContext context, Cloudinary cloudinary)
        {
            _context = context;
            _cloudinary = cloudinary;
        }

        // GET: api/inventory
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Product>>> GetProducts()
        {
            return await _context.Products.ToListAsync();
        }

        // GET: api/inventory/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Product>> GetProductById(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            return product;
        }

        // GET: api/inventory/byname/Laptop
        [HttpGet("byname/{name}")]
        public async Task<ActionResult<Product>> GetProductByName(string name)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Name == name);
            if (product == null)
                return NotFound();

            return product;
        }

        // POST: api/inventory (create with image upload)
        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct([FromForm] ProductUploadDto dto)
        {
            if (dto == null)
                return BadRequest("Invalid request payload.");

            if (dto.Image == null || dto.Image.Length == 0)
                return BadRequest("Image file is required.");

            // duplicate check (case-insensitive on Name)
            var exists = await _context.Products
                .AnyAsync(p => p.Name.ToLower() == dto.Name.ToLower());
            if (exists) return Conflict(new { message = "Product with this name already exists." });

            // Upload to Cloudinary
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(dto.Image.FileName, dto.Image.OpenReadStream())
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult == null || uploadResult.Error != null)
                return StatusCode(500, $"Image upload failed: {uploadResult?.Error?.Message}");

            // Save product in DB
            var product = new Product
            {
                Name = dto.Name,
                Price = dto.Price,
                Qty = dto.Qty,
                status = dto.status,
                Uri = uploadResult.SecureUrl?.ToString() ?? string.Empty,
                PublicId = uploadResult.PublicId ?? string.Empty
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
        }


        // PUT: api/inventory/5 (update with optional new image)
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] ProductUploadDto dto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            product.Name = dto.Name;
            product.Price = dto.Price;
            product.Qty = dto.Qty;
            product.status = dto.status;

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
            return NoContent();
        }

        // DELETE: api/inventory/5 (delete product + image)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            // Delete from Cloudinary
            if (!string.IsNullOrEmpty(product.PublicId))
            {
                await _cloudinary.DestroyAsync(new DeletionParams(product.PublicId));
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        
        // PATCH api/inventory/5/adjust-qty?delta=-3  (negative to reduce)
        [HttpPatch("{id:int}/adjust-qty")]
        public async Task<IActionResult> AdjustQuantity(int id, [FromQuery] int delta)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            if (delta < 0 && product.Qty + delta < 0)
                return BadRequest(new { message = "Insufficient stock." });

            product.Qty += delta;
            await _context.SaveChangesAsync();
            return Ok(new { product.Id, product.Name, product.Qty });
        }

    }
}
