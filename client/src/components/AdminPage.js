import React from 'react'
import PendingOrders from './PendingOrders'

function AdminPage({ rest }) {
  
  const mappedSubmmitedOrders = () => {
    return rest.orders.map(order => <PendingOrders key={order.id} order={order} />)
  }
   return (

     <div>AdminPage
       {mappedSubmmitedOrders()}
    </div>
  )
}

export default AdminPage