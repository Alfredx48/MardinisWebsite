import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCheck, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { useRestaurant } from "../context/RestaurantContext";

// Invitations to start a group order, in a few sizes. Hidden while online
// ordering is paused.
//   strip: one line, for the top of the menu page
//   card:  a short pitch with a button (catering page, cart)
export default function GroupOrderPromo({ variant = "card", onStart }) {
	const { restaurant } = useRestaurant();
	if (restaurant && !restaurant.accepting_orders) return null;

	if (variant === "strip") {
		return (
			<Link to="/group/new" className="group-promo-strip">
				<FontAwesomeIcon icon={faUserGroup} />
				<span>
					<strong>Ordering for the office?</strong> Send one link, everyone picks their own, you pay once.
				</span>
				<span className="group-promo-strip-cta">
					Start a group order <FontAwesomeIcon icon={faArrowRight} />
				</span>
			</Link>
		);
	}

	return (
		<div className="group-promo-card">
			<span className="group-promo-icon">
				<FontAwesomeIcon icon={faUserGroup} />
			</span>
			<div>
				<strong>Ordering for a team?</strong>
				<p>Share one link. Everyone adds their own food with their name on it, and you pay once.</p>
				<Link to="/group/new" className="link-arrow" onClick={onStart}>
					Start a group order <FontAwesomeIcon icon={faArrowRight} />
				</Link>
			</div>
		</div>
	);
}

const EXAMPLE = [
	["Sarah", "Falafel Wrap", true],
	["Mike", "Chicken Shawarma Plate", true],
	["Ana", "Greek Salad", false],
];

// The home page section: what it is, how it works, and a sample group order.
export function GroupOrderSection() {
	const { restaurant } = useRestaurant();
	if (restaurant && !restaurant.accepting_orders) return null;
	return (
		<section className="section group-promo-section">
			<div className="container group-promo-grid">
				<div>
					<span className="eyebrow">New · Group orders</span>
					<h2>Lunch for the whole team, without collecting orders</h2>
					<p className="group-promo-lede">
						Send your coworkers one link. Everyone picks their own food, we write their name on it, and you pay once.
						No accounts, no spreadsheets, no mix-ups at pickup.
					</p>
					<ol className="group-promo-steps">
						<li>
							<strong>Share a link</strong> by email or chat. Set a deadline or a budget per person if you like.
						</li>
						<li>
							<strong>Everyone adds their own</strong> from the full menu and taps I'm done.
						</li>
						<li>
							<strong>You check out once</strong>, by card or at pickup. Each meal is labeled with a name.
						</li>
					</ol>
					<Link to="/group/new" className="btn btn-primary btn-lg">
						Start a group order <FontAwesomeIcon icon={faArrowRight} />
					</Link>
				</div>

				<div className="group-example card" role="img" aria-label="Example: a team lunch where Sarah and Mike are done and Ana is still choosing">
					<div className="group-example-head">
						<span className="eyebrow">Group order</span>
						<strong>Friday team lunch</strong>
						<span className="muted small">Order by 11:30 AM · Up to $20 each</span>
					</div>
					<ul>
						{EXAMPLE.map(([name, dish, done]) => (
							<li key={name}>
								<span className="group-example-tag">{name}</span>
								<span className="group-example-dish">{dish}</span>
								<span className={`group-status${done ? " is-done" : ""}`}>
									{done ? (
										<>
											<FontAwesomeIcon icon={faCheck} /> Done
										</>
									) : (
										"Still choosing"
									)}
								</span>
							</li>
						))}
					</ul>
					<div className="group-example-foot">One order for the kitchen · one payment</div>
				</div>
			</div>
		</section>
	);
}
