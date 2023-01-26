import React, { useEffect, useState } from 'react'
import moment from 'moment';
import OrderItems from './OrderItems';
import "../css/orders.css"

function PendingOrders({ order }) {
  const [orderItems, setOrderItems] = useState([])
  const [displayItems, setDisplatItems] = useState(false)
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
    if (!orderItems) return <h1>hi</h1>
    return orderItems.map(orderItem => <OrderItems orderItem={orderItem} />)
  }

  const handleDisplayItems = () => {
    setDisplatItems(!displayItems)
  }
  return (
    <div className='orders-c'>
    <div onClick={handleDisplayItems} className='orders'>
      <h2> status: {order.status}</h2>
      <p> Total: {formatter.format(order.total_cost)}</p>
      <p> Items: {order.total_items}</p>
      <p>{date}</p>
     { displayItems ?  <div className='order-items'>
      {mappedOrderItems()}
      </div> : null }
    </div>
    </div>
  )
}

export default PendingOrders