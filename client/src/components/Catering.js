import React from "react";
import ImageSlideshow from "./ImageSlideshow";
import "../css/catering.css";
import { motion } from "framer-motion";

const Catering = ({ rest }) => {
	const transition = {
		type: "tween",
		ease: "easeInOut",
		duration: .7,
	};

	const catringImages = [
		"https://i.imgur.com/7Zzqmqq.jpg",
		"https://i.imgur.com/MZNrVS9.jpg",
		"https://i.imgur.com/zSAyfuu.jpg",
		"https://i.imgur.com/0EQmUKa.jpg",
	];
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
				<ImageSlideshow images={catringImages} />
			</div>
		</motion.div>
	);
};

export default Catering;
