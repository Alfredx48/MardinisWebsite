import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faEnvelope, faLocationDot, faPhone } from "@fortawesome/free-solid-svg-icons";
import { useRestaurant } from "../context/RestaurantContext";
import { Spinner } from "../components/ui";
import { DAYS, hoursLabel, telHref } from "../format";

export default function AboutPage() {
	const { restaurant } = useRestaurant();
	if (!restaurant) return <Spinner />;

	const mapQuery = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
	const today = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Los_Angeles" });

	return (
		<div className="container page">
			<div className="about-grid">
				<div>
					<span className="eyebrow">About us</span>
					<h1>{restaurant.name}</h1>
					{restaurant.logo_image && <img className="about-logo" src={restaurant.logo_image} alt="" />}
					<p className="about-lede">{restaurant.description}</p>
					<div className="row">
						<Link to="/menu" className="btn btn-primary">
							Order for pickup
						</Link>
						<Link to="/catering" className="btn btn-secondary">
							Catering
						</Link>
					</div>
				</div>

				<div className="card">
					<ul className="visit-list">
						<li>
							<FontAwesomeIcon icon={faLocationDot} />
							<a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">
								{restaurant.address}
							</a>
						</li>
						<li>
							<FontAwesomeIcon icon={faPhone} />
							<a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
						</li>
						{restaurant.email && (
							<li>
								<FontAwesomeIcon icon={faEnvelope} />
								<a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
							</li>
						)}
						<li>
							<FontAwesomeIcon icon={faClock} />
							<div>
								<strong className={restaurant.open_now ? "text-open" : "text-closed"}>
									{restaurant.open_now ? "Open now" : "Closed now"}
								</strong>
								<dl className="hours-list hours-full">
									{DAYS.map(([key, name]) => (
										<div key={key} className={name === today ? "is-today" : ""}>
											<dt>{name}</dt>
											<dd>{hoursLabel(restaurant.hours[key])}</dd>
										</div>
									))}
								</dl>
							</div>
						</li>
					</ul>
				</div>
			</div>

			<div className="map-frame">
				<iframe
					title="Map to Mardini's"
					loading="lazy"
					referrerPolicy="no-referrer-when-downgrade"
					src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
				/>
			</div>
		</div>
	);
}
