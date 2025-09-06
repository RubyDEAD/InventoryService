using Microsoft.EntityFrameworkCore;
using InventoryService.Models;
namespace InventoryService.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        public DbSet<Product> Products { get; set; }

    }
}
