CURRENT PROCEDURE:
1. Run InventoryService
- dotnet run
2. Run sales-service
- node index.js
3. Check if items are ready and in stock
- GET http://localhost:5145/api/inventory
4. Create the sample order
- POST http://localhost:3000/orders/sample
5. Confirm the sample order
- POST http://localhost:3000/orders/<orderId>/confirm