import React from 'react'
import moment from 'moment';



function PendingOrders({ order }) {
    const format = "MMMM Do YYYY, h:mm a";
    const date = moment(order.created_at).format(format);

    
  return (
    <div>
      <h1>{order.status}</h1>
      <p>{order.total_cost}</p>
      <p>{order.total_items}</p>
      <p>{date}</p>

      

    </div>
  )
}

export default PendingOrders