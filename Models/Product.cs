using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace InventoryService.Models
{

    [Index(nameof(Name), IsUnique = true)]
    public class Product
    {
        public int Id { get; set; }
        [Required] public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Qty { get; set; }

        public int Current_Qty { get; set; }
        public bool status { get; set; }
        public string Uri { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
    }
}
