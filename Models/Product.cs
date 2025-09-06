namespace InventoryService.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Qty { get; set; }
        public bool status { get; set; }
        public string Uri { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
    }
}
