import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { useRestaurant } from "../context/RestaurantContext";
import { shiftDate, telHref, todayInRestaurant } from "../format";

const PHOTOS = [
	"https://i.imgur.com/7Zzqmqq.jpg",
	"https://i.imgur.com/MZNrVS9.jpg",
	"https://i.imgur.com/zSAyfuu.jpg",
	"https://i.imgur.com/0EQmUKa.jpg",
];

const EMPTY = { name: "", email: "", phone: "", event_date: "", guest_count: "", message: "" };

export default function CateringPage() {
	const { restaurant } = useRestaurant();
	const [form, setForm] = useState(EMPTY);
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [errors, setErrors] = useState([]);

	const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

	const submit = async (e) => {
		e.preventDefault();
		setSending(true);
		setErrors([]);
		try {
			await api.post("/catering_inquiries", form);
			setSent(true);
			setForm(EMPTY);
		} catch (err) {
			setErrors(err.errors?.length ? err.errors : [err.message]);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="catering-page">
			<div className="container page">
				<div className="catering-grid">
					<div>
						<span className="eyebrow">Catering</span>
						<h1>You plan the party. We'll handle the food.</h1>
						<p className="about-lede">
							Shawarma and falafel platters, kabob trays, sandwich boxes and big salads, sized for office lunches,
							birthdays and family gatherings. Tell us about your event and we'll get back to you with options.
						</p>
						{restaurant && (
							<p>
								Prefer to talk? Call <a href={telHref(restaurant.phone)}>{restaurant.phone}</a>.
							</p>
						)}
						<div className="photo-grid">
							{PHOTOS.map((src) => (
								<img key={src} src={src} alt="Catering spread from Mardini's" loading="lazy" />
							))}
						</div>
					</div>

					<div className="card catering-form-card">
						{sent ? (
							<div className="empty-state">
								<FontAwesomeIcon icon={faCircleCheck} className="text-open" />
								<h3>Thanks! We got your request.</h3>
								<p>We'll reach out within one business day to talk through the menu and details.</p>
								<button className="btn btn-secondary" onClick={() => setSent(false)}>
									Send another request
								</button>
							</div>
						) : (
							<form onSubmit={submit} className="stack">
								<h2 className="card-title">Request a quote</h2>
								<div className="field">
									<label htmlFor="cat-name">Your name</label>
									<input id="cat-name" className="input" required value={form.name} onChange={set("name")} />
								</div>
								<div className="grid-2">
									<div className="field">
										<label htmlFor="cat-phone">Phone</label>
										<input id="cat-phone" className="input" type="tel" required value={form.phone} onChange={set("phone")} />
									</div>
									<div className="field">
										<label htmlFor="cat-email">Email</label>
										<input id="cat-email" className="input" type="email" value={form.email} onChange={set("email")} />
									</div>
								</div>
								<div className="grid-2">
									<div className="field">
										<label htmlFor="cat-date">Event date</label>
										<input id="cat-date" className="input" type="date" min={shiftDate(todayInRestaurant(), 1)}
											value={form.event_date} onChange={set("event_date")} />
									</div>
									<div className="field">
										<label htmlFor="cat-guests">Number of guests</label>
										<input id="cat-guests" className="input" type="number" min="1" inputMode="numeric"
											value={form.guest_count} onChange={set("guest_count")} />
									</div>
								</div>
								<div className="field">
									<label htmlFor="cat-msg">Tell us about your event</label>
									<textarea id="cat-msg" className="textarea" maxLength={2000} value={form.message} onChange={set("message")}
										placeholder="Pickup or delivery, dietary needs, favorite dishes, budget…" />
								</div>
								{errors.length > 0 && (
									<div className="form-error" role="alert">
										{errors.join(". ")}
									</div>
								)}
								<button className="btn btn-primary btn-lg btn-block" disabled={sending}>
									{sending ? "Sending…" : "Send request"}
								</button>
							</form>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
