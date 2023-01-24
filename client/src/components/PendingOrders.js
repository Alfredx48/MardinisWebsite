import React, { useEffect, useState } from 'react'
import moment from 'moment';
import OrderItems from './OrderItems';

function PendingOrders({ order }) {
  const [orderItems, setOrderItems] = useState([])
    const format = "MMMM Do YYYY, h:mm a";
  const date = moment(order.created_at).format(format);
  
  const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
  })

  useEffect(() => {
    if (order)
      setOrderItems(order.order_items)
  }, [order])
  
  const mappedOrderItems = () => {
    console.log(order)
    if(!orderItems) return <h1>hi</h1>
    return orderItems.map(orderItem => <OrderItems orderItem={orderItem} />)
  }

    
  return (
    <div>
      <h1>{order.status}</h1>
      <p>{formatter.format(order.total_cost)}</p>
      <p>{order.total_items}</p>
      <p>{date}</p>
      {mappedOrderItems()}
    </div>
  )
}

export default PendingOrders