import { Link } from "react-router-dom";
import { useRestaurant } from "../context/RestaurantContext";
import { groupedHours, telHref } from "../format";

export default function Footer() {
	const { restaurant } = useRestaurant();
	const mapsUrl = restaurant
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`
		: "#";

	return (
		<footer className="site-footer no-print">
			<div className="container footer-grid">
				<div>
					<div className="brand brand-footer">
						<span className="brand-name">Mardini's</span>
						<span className="brand-sub">Deli Cafe</span>
					</div>
					<p className="footer-tag">{restaurant?.tagline || "Mediterranean & American favorites, made fresh."}</p>
				</div>
				<div>
					<h4>Visit</h4>
					{restaurant && (
						<>
							<a href={mapsUrl} target="_blank" rel="noreferrer">
								{restaurant.address}
							</a>
							<br />
							<a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
						</>
					)}
				</div>
				<div>
					<h4>Hours</h4>
					<dl className="footer-hours">
						{groupedHours(restaurant?.hours).map(([days, label]) => (
							<div key={days}>
								<dt>{days}</dt>
								<dd>{label}</dd>
							</div>
						))}
					</dl>
				</div>
				<div>
					<h4>Explore</h4>
					<ul className="footer-links">
						<li>
							<Link to="/menu">Order online</Link>
						</li>
						<li>
							<Link to="/catering">Catering</Link>
						</li>
						<li>
							<Link to="/about">About &amp; directions</Link>
						</li>
						<li>
							<Link to="/account">Your orders</Link>
						</li>
					</ul>
				</div>
			</div>
			<div className="container footer-bottom">
				© {new Date().getFullYear()} {restaurant?.name || "Mardini's Deli Cafe"} · Menlo Park, California
			</div>
		</footer>
	);
}
