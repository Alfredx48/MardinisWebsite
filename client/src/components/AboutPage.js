import React from 'react'

function AboutPage({restaurant}) {
 
  return (
    <div>
      <h1>{restaurant.name}</h1>
      <h1>{restaurant.hours_of_operation}</h1>
      <p>{restaurant.description}</p>
      <h3>{restaurant.address}</h3>
      <h4>{restaurant.phone}</h4>
    </div>
  )
}

export default AboutPage