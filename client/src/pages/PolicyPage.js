import { Link } from "react-router-dom";
import { useRestaurant } from "../context/RestaurantContext";
import { telHref } from "../format";

const UPDATED = "September 25, 2026";

export default function PolicyPage() {
	const { restaurant } = useRestaurant();
	const name = restaurant?.name || "Mardini's Deli Cafe";
	const address = restaurant?.address || "408 Willow Rd, Menlo Park, CA 94025";
	const phone = restaurant?.phone || "(650) 324-4316";
	const call = <a href={telHref(phone)}>{phone}</a>;
	// Describe only the payment options the restaurant has switched on.
	const payInStore = restaurant ? restaurant.payments.in_store : false;
	const payOnline = restaurant ? restaurant.payments.card : true;

	return (
		<div className="container page narrow policy-page">
			<div className="page-header">
				<span className="eyebrow">Policies</span>
				<h1>Ordering &amp; refund policy</h1>
				<p>Last updated {UPDATED}</p>
			</div>

			<nav className="card policy-toc" aria-label="On this page">
				<strong>On this page</strong>
				<ul>
					<li><a href="#pickup">Pickup only</a></li>
					<li><a href="#payment">Prices &amp; payment</a></li>
					<li><a href="#cancelling">Cancelling an order</a></li>
					<li><a href="#problems">Problems with your order</a></li>
					<li><a href="#refunds">Refunds</a></li>
					<li><a href="#not-picked-up">Orders not picked up</a></li>
					<li><a href="#catering">Catering</a></li>
					<li><a href="#allergies">Allergies</a></li>
				</ul>
			</nav>

			<section id="pickup" className="policy-section">
				<h2>Pickup only</h2>
				<p>
					All online orders are for pickup at {name}, {address}. We don't offer delivery through our website. You can
					order for as soon as possible or schedule a pickup time during our opening hours.
				</p>
			</section>

			<section id="payment" className="policy-section">
				<h2>Prices &amp; payment</h2>
				<p>
					Menu prices are in U.S. dollars. California sales tax is added at checkout.{" "}
					{payOnline && payInStore
						? "You can pay online by card when you order, or pay at the counter with cash or card when you pick up."
						: payOnline
						? "Online orders are paid by card when you order."
						: "Online orders are paid at the counter with cash or card when you pick up."}{" "}
					Tips are optional and go to our staff.
				</p>
			</section>

			<section id="cancelling" className="policy-section">
				<h2>Cancelling an order</h2>
				<p>
					You can cancel from your order's tracking page (the link you see after ordering) until we start preparing it.
					If you paid online, we'll refund your card in full automatically. Once your order is being prepared, call us
					at {call} and we'll do our best to help, though we may not be able to cancel it.
				</p>
				<p>
					If we can't fulfill your order, for example because an item has sold out, we'll contact you and give you a
					full refund.
				</p>
			</section>

			<section id="problems" className="policy-section">
				<h2>Problems with your order</h2>
				<p>
					If something is missing, incorrect or not right with your food, call us the same day at {call} and we'll make
					it right by replacing the item or refunding it.
				</p>
			</section>

			<section id="refunds" className="policy-section">
				<h2>Refunds</h2>
				<p>
					Refunds for card payments go back to the original card. Depending on your bank, they usually appear within
					5–10 business days.{payInStore && " Orders paid at the counter are refunded in person."}
				</p>
			</section>

			<section id="not-picked-up" className="policy-section">
				<h2>Orders not picked up</h2>
				<p>
					We hold orders for up to 1 hour after the pickup time. Prepaid orders that aren't picked up can't be
					refunded, since the food has already been prepared.
				</p>
			</section>

			<section id="catering" className="policy-section">
				<h2>Catering</h2>
				<p>
					Catering requests aren't confirmed until we've agreed on the details with you. Payment and cancellation
					terms for catering are arranged individually for each event. <Link to="/catering">Request a quote</Link>.
				</p>
			</section>

			<section id="allergies" className="policy-section">
				<h2>Allergies</h2>
				<p>
					Our kitchen handles wheat, dairy, eggs, sesame, soy, nuts and other common allergens, and we can't guarantee
					any dish is allergen-free. Please tell us about allergies in your order notes or call us before ordering.
				</p>
			</section>

			<div className="card policy-contact">
				<div>
					<strong>Questions?</strong>
					<p className="muted small">We're happy to help with anything about your order.</p>
				</div>
				<a className="btn btn-primary" href={telHref(phone)}>
					Call {phone}
				</a>
			</div>
		</div>
	);
}
