import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faClock, faLocationDot, faPhone } from "@fortawesome/free-solid-svg-icons";
import { useRestaurant } from "../context/RestaurantContext";
import { DishImage } from "../components/ui";
import { DAYS, groupedHours, hoursLabel, priceLabel, telHref } from "../format";

const FALLBACK_HERO = "https://i.imgur.com/SobZND4.jpg";

function todayKey() {
	const index = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Los_Angeles" });
	return DAYS.find(([, name]) => name.startsWith(index))?.[0];
}

export default function HomePage() {
	const { restaurant, menu } = useRestaurant();

	const featured = useMemo(() => {
		const all = (menu || []).flatMap((c) => c.items.filter((i) => i.available));
		const picks = all.filter((i) => i.featured);
		return (picks.length ? picks : all.filter((i) => i.image)).slice(0, 6);
	}, [menu]);

	const categoryTiles = useMemo(
		() =>
			(menu || [])
				.map((c) => ({ ...c, cover: c.items.find((i) => i.image)?.image }))
				.filter((c) => c.items.length),
		[menu]
	);

	const today = restaurant?.hours?.[todayKey()];

	return (
		<div className="home">
			<section
				className="hero"
				style={{ backgroundImage: `url(${restaurant?.hero_image || FALLBACK_HERO})` }}
			>
				<div className="hero-shade" />
				<div className="container hero-content">
					<span className="eyebrow eyebrow-light">Family-owned · Menlo Park</span>
					<h1>
						Mediterranean comfort,
						<br />
						deli classics.
					</h1>
					<p className="hero-lede">
						{restaurant?.tagline ||
							"Shawarma, falafel and kabob plates alongside burgers and hot sandwiches, made to order on Willow Road."}
					</p>
					<div className="row hero-actions">
						<Link to="/menu" className="btn btn-primary btn-lg">
							Start your order <FontAwesomeIcon icon={faArrowRight} />
						</Link>
						<Link to="/catering" className="btn btn-light btn-lg">
							Catering
						</Link>
					</div>
					{restaurant && (
						<div className="hero-status">
							<span className={`status-dot ${restaurant.open_now ? "is-open" : ""}`} />
							<span>
								{restaurant.open_now ? "Open now" : "Closed now"} · Today {hoursLabel(today)}
								{!restaurant.accepting_orders && " · Online ordering paused"}
								{restaurant.accepting_orders && !restaurant.accepting_asap && " · Schedule ahead for pickup"}
							</span>
						</div>
					)}
				</div>
			</section>

			{featured.length > 0 && (
				<section className="section">
					<div className="container">
						<div className="section-head">
							<div>
								<span className="eyebrow">Crowd favorites</span>
								<h2>What Menlo Park is ordering</h2>
							</div>
							<Link to="/menu" className="btn btn-secondary">
								Full menu
							</Link>
						</div>
						<div className="featured-grid">
							{featured.map((item) => (
								<Link to={`/menu?item=${item.id}`} key={item.id} className="featured-card">
									<DishImage src={item.image} name={item.name} className="featured-img" />
									<div className="featured-body">
										<h3>{item.name}</h3>
										<span className="money">{priceLabel(item)}</span>
									</div>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			{categoryTiles.length > 0 && (
				<section className="section section-tinted">
					<div className="container">
						<div className="section-head">
							<div>
								<span className="eyebrow">The menu</span>
								<h2>Something for everyone</h2>
							</div>
						</div>
						<div className="category-tiles">
							{categoryTiles.map((c) => (
								<Link key={c.id} to={`/menu#category-${c.id}`} className="category-tile">
									<DishImage src={c.cover} name={c.name} className="category-tile-img" />
									<div className="category-tile-label">
										<strong>{c.name}</strong>
										<span>{c.items.length} dishes</span>
									</div>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			<section className="section">
				<div className="container story">
					<div className="story-text">
						<span className="eyebrow">Our story</span>
						<h2>A neighborhood deli with a Mediterranean heart</h2>
						<p>
							{restaurant?.description ||
								"Mardini's is a family-run cafe serving Mediterranean specialties and American deli favorites."}
						</p>
						<Link to="/about" className="link-arrow">
							Hours &amp; directions <FontAwesomeIcon icon={faArrowRight} />
						</Link>
					</div>
					{restaurant && (
						<div className="visit-card card">
							<h3>Visit us</h3>
							<ul className="visit-list">
								<li>
									<FontAwesomeIcon icon={faLocationDot} />
									<span>{restaurant.address}</span>
								</li>
								<li>
									<FontAwesomeIcon icon={faPhone} />
									<a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
								</li>
								<li>
									<FontAwesomeIcon icon={faClock} />
									<dl className="hours-list">
										{groupedHours(restaurant.hours).map(([days, label]) => (
											<div key={days}>
												<dt>{days}</dt>
												<dd>{label}</dd>
											</div>
										))}
									</dl>
								</li>
							</ul>
						</div>
					)}
				</div>
			</section>

			<section className="section catering-band">
				<div className="container catering-band-inner">
					<div>
						<span className="eyebrow eyebrow-light">Catering</span>
						<h2>Feeding a crowd? We've got the platters.</h2>
						<p>Office lunches, birthdays and family gatherings. Tell us about your event and we'll put a spread together.</p>
					</div>
					<Link to="/catering" className="btn btn-light btn-lg">
						Plan your event
					</Link>
				</div>
			</section>
		</div>
	);
}
