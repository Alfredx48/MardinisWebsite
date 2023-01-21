import React from 'react'
import moment from 'moment';



function PendingOrders({ order }) {
    const format = "MMMM Do YYYY, h:mm a";
  const date = moment(order.created_at).format(format);
  
  const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	})

    
  return (
    <div>
      <h1>{order.status}</h1>
      <p>{formatter.format(order.total_cost)}</p>
      <p>{order.total_items}</p>
      <p>{date}</p>

      

    </div>
  )
}

export default PendingOrders