namespace InventoryService.Models
{
    public class ProductUploadDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Qty { get; set; }
        public bool status { get; set; }
        public IFormFile? Image { get; set; }
    }

}
