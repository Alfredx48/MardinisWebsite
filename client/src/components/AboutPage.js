import React from "react";
import "../css/about.css";
import { motion } from "framer-motion";

function AboutPage({ restaurant }) {
	return (
		<motion.div
			className="about-div"
			initial={{ y: "100vh" }}
			animate={{ y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<div className="about-div">
				<img src="https://i.imgur.com/Scnc7hH.png" alt="mardinis logo" />
				<div className="info-div">
					<h2 className="about-l">Located In Beautiful Menlo Park, CA</h2>
					{/* <h1>{restaurant.name}</h1> */}
					<h2>{restaurant.address}</h2>
					<h2> We are Open : </h2>
					<h2> Monday to Saturday - {restaurant.hours_of_operation} </h2>
					<h2> Sundays - 10am - 8pm</h2>
					<h2>Contact us at : {restaurant.phone}</h2>
					<h4>{restaurant.description}</h4>
				</div>
			</div>
		</motion.div>
	);
}

export default AboutPage;
