
import { ordersTable } from "./schema";
import { db } from "./db";

interface Order{
    clientOid:string;
    symbol:string;
    type:string;
    side:string;
    price:string;
    size:string;
    exchangeName:string;
}


/**
 * Insert an order into the database
 * @param order - The order to insert
 * @returns The inserted order
 */
export const InsertOrder=async({
    clientOid,
    symbol,
    type,
    side,
    price,
    size,
    exchangeName
}:Order)=>{
    try{
        const newOrder=await db.insert(ordersTable).values({
            clientOid:clientOid,
            symbol:symbol,
            type:type,
            side:side,
            price:price,
            size:size,
            createdAt:new Date(),
            exchangeName:exchangeName
        }).returning();
        return newOrder[0];
    }catch(error){
        console.error("Error inserting order", error);
    }
}