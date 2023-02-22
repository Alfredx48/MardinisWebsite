import React from "react";
import ImageSlideshow from "./ImageSlideshow";
import "../css/catering.css";
import { motion } from "framer-motion";
import { cateringImages } from "./MenuImages";

const Catering = ({ rest }) => {
	const transition = {
		type: "tween",
		ease: "easeInOut",
		duration: 0.7,
	};

	return (
		<motion.div
			className="catering"
			initial={{ x: "100%", y: "-100%" }}
			animate={{ x: 0, y: 0 }}
			transition={transition}
		>
			<div className="catering">
				<img src="https://i.imgur.com/Scnc7hH.png" alt="mardinis logo" />
				<h2> You plan the party. We do the rest.</h2>
				<h3>Contact us at : {rest.phone} for more infomation</h3>
				<ImageSlideshow images={cateringImages} />
			</div>
		</motion.div>
	);
};

export default Catering;
