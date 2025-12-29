using Microsoft.AspNetCore.SignalR;

namespace InventoryService.Hubs
{
    public class InventoryHub : Hub
    {
        // Broadcast inventory changes to all connected clients
        public async Task SendInventoryUpdate(string message, object data)
        {
            await Clients.All.SendAsync("InventoryUpdated", message, data);
        }
    }
}