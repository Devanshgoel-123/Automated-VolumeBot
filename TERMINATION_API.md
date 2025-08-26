# Bot Termination API Documentation

This document describes the new termination endpoints added to the Volume Bot API for safely stopping the bot and cancelling all pending orders across all exchanges.

## Overview

The termination system provides a safe way to:
- Stop the bot from processing new trades
- Cancel all pending orders across all exchanges (KuCoin, GateX)
- Update order status in the database
- Send notifications via Telegram
- Restart the bot if needed

## API Endpoints

### 1. GET /status
Check the current status of the bot and available endpoints.

**Response:**
```json
{
  "status": "running",
  "botRunning": true,
  "activeExchanges": ["KuCoin", "GateX"],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "endpoints": {
    "start": "POST /startBot",
    "terminate": "POST /terminate",
    "status": "GET /status",
    "restart": "POST /restart",
    "testTelegram": "POST /testTelegram"
  }
}
```

### 2. POST /terminate
Safely terminate the bot and cancel all pending orders.

**Response:**
```json
{
  "message": "Bot terminated successfully",
  "status": "terminated",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Process:**
1. Sets `isBotRunning` to `false` to stop new trade processing
2. Retrieves all active orders from the database for each exchange
3. Cancels each order using the exchange's API
4. Updates order status in the database to `false`
5. Sends Telegram notifications about the termination
6. Returns success response

### 3. POST /restart
Restart the bot after termination.

**Response:**
```json
{
  "message": "Bot restarted successfully",
  "status": "restarted",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Process:**
1. Sets `isBotRunning` to `false` for cleanup
2. Waits 2 seconds for cleanup operations
3. Sets `isBotRunning` to `true`
4. Restarts the bot instance
5. Sends Telegram notifications

### 4. POST /testTelegram
Send a test message via Telegram to verify notifications are working.

**Response:**
```
Test message sent
```

## Database Functions

### GetActiveOrders(exchangeName: string)
Retrieves all active orders for a specific exchange from the database.

### UpdateOrderStatus(clientOid: string, status: boolean)
Updates the status of an order in the database (true = active, false = cancelled/completed).

### GetAllActiveOrders()
Retrieves all active orders across all exchanges.

## Exchange-Specific Implementation

### KuCoin
- Uses `CancelOrder()` function to cancel individual orders by clientOid
- Uses `CancelAllOrders()` function to cancel all orders for a symbol
- Implements proper error handling and logging

### GateX
- Uses placeholder implementation for order cancellation
- TODO: Implement actual order cancellation when GateX API is properly configured
- Provides logging for debugging purposes

## Error Handling

The termination system includes comprehensive error handling:

1. **Individual Order Cancellation**: If one order fails to cancel, others continue
2. **Exchange-Level Errors**: If one exchange fails, others continue
3. **Database Errors**: Graceful handling of database connection issues
4. **API Errors**: Proper error logging and Telegram notifications

## Telegram Notifications

The system sends notifications for:
- Termination initiation
- Successful order cancellations per exchange
- Termination completion
- Restart initiation and completion
- Error conditions

## Testing

Use the provided test script to verify the termination functionality:

```bash
node test-termination.js
```

This script tests:
1. Status endpoint
2. Telegram notifications
3. Bot termination
4. Status after termination
5. Bot restart

## Security Considerations

- All endpoints are currently unprotected (no authentication)
- Consider adding API key authentication for production use
- Log all termination requests for audit purposes
- Implement rate limiting to prevent abuse

## Future Enhancements

1. **Real-time Order Status**: WebSocket updates for order status changes
2. **Partial Termination**: Cancel orders for specific exchanges only
3. **Scheduled Termination**: Schedule bot termination at specific times
4. **Order History**: Track cancelled orders for reporting
5. **Rollback Capability**: Ability to restore cancelled orders

## Troubleshooting

### Common Issues

1. **Orders Not Cancelling**: Check exchange API credentials and permissions
2. **Database Errors**: Verify database connection and schema
3. **Telegram Notifications**: Check Telegram bot token and chat ID
4. **Bot Not Stopping**: Verify `isBotRunning` flag is being set correctly

### Debug Commands

```bash
# Check bot status
curl http://localhost:3000/status

# Test Telegram
curl -X POST http://localhost:3000/testTelegram

# Terminate bot
curl -X POST http://localhost:3000/terminate

# Restart bot
curl -X POST http://localhost:3000/restart
```
