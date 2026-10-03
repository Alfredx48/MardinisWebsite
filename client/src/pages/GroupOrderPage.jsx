import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy, faEnvelope, faLock, faTrashCan, faUserGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { CartContext } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { DishImage, EmptyState, QuantityStepper, Spinner, useDismiss } from "../components/ui";
import { money } from "../format";
import {
	deadlineLabel,
	describeItem,
	groupTitle,
	inviteMailto,
	keyHeaders,
	loadKeys,
	menuIndexOf,
	saveKeys,
	shareUrl,
} from "../groupOrder";
import MenuPage from "./MenuPage";

const POLL_MS = 10000;

// The shared cart at /group/:token. Everyone with the link joins with their
// name and adds items from the normal menu; the organizer (host) sees the
// totals, can close ordering, and checks out once.
export default function GroupOrderPage() {
	const { token } = useParams();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const { restaurant, menu } = useRestaurant();
	const [keys, setKeys] = useState(() => loadKeys(token));
	const [group, setGroup] = useState(null);
	const [error, setError] = useState(null);
	const [cartOpen, setCartOpen] = useState(false);

	// The organizer's emailed link carries their key. Keep it in this browser and
	// take it out of the address bar, so copying the URL never shares it.
	const hostParam = searchParams.get("host");
	useEffect(() => {
		if (!hostParam) return;
		setKeys(saveKeys(token, { host: hostParam }));
		const next = new URLSearchParams(searchParams);
		next.delete("host");
		setSearchParams(next, { replace: true });
	}, [hostParam, token, searchParams, setSearchParams]);

	const headers = useMemo(() => keyHeaders(keys), [keys]);

	const load = useCallback(async () => {
		try {
			setGroup(await api.get(`/group_orders/${token}`, headers));
			setError(null);
		} catch (e) {
			setError(e);
		}
	}, [token, headers]);

	useEffect(() => {
		if (hostParam) return undefined; // wait until the key is saved
		load();
		const id = setInterval(load, POLL_MS);
		return () => clearInterval(id);
	}, [load, hostParam]);

	const menuIndex = useMemo(() => menuIndexOf(menu), [menu]);
	const me = group?.participants.find((p) => p.id === group.me);
	const isHost = Boolean(group?.is_host);
	const canAdd = Boolean(me && (group.accepting_items || (isHost && !group.placed && !group.expired)));
	// Someone who said they're done sees a summary instead of the menu.
	const finished = Boolean(me && !isHost && me.done && group.accepting_items);

	const people = useMemo(
		() =>
			(group?.participants || []).map((p) => {
				const items = p.items.map((i) => describeItem(i, menuIndex));
				return {
					...p,
					items,
					count: items.reduce((n, i) => n + i.quantity, 0),
					total: items.reduce((n, i) => n + i.total, 0),
				};
			}),
		[group, menuIndex]
	);
	const mine = people.find((p) => p.id === group?.me);
	const totalCount = people.reduce((n, p) => n + p.count, 0);
	const totalPrice = people.reduce((n, p) => n + p.total, 0);

	// The menu adds to this group instead of the personal bag.
	const groupCart = useMemo(
		() => ({
			group: true,
			count: mine?.count || 0,
			subtotal: mine?.total || 0,
			addItem: async (menuItem, quantity, specialRequest, size, modifiers) => {
				const updated = await api.post(
					`/group_orders/${token}/items`,
					{ menu_item_id: menuItem.id, quantity, special_request: specialRequest, size, modifiers },
					headers
				);
				setGroup(updated);
			},
			openDrawer: () => setCartOpen(true),
			closeDrawer: () => setCartOpen(false),
		}),
		[token, headers, mine]
	);

	const changeItem = async (item, quantity) => {
		try {
			const path = `/group_orders/${token}/items/${item.id}`;
			setGroup(quantity > 0 ? await api.patch(path, { quantity }, headers) : await api.delete(path, headers));
		} catch (e) {
			toast.error(e.message);
		}
	};

	const setOpen = async (open) => {
		try {
			setGroup(await api.patch(`/group_orders/${token}`, { open }, headers));
		} catch (e) {
			toast.error(e.message);
		}
	};

	const markDone = async (done) => {
		try {
			setGroup(await api.post(`/group_orders/${token}/done`, { done }, headers));
			if (done) setCartOpen(false);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (e) {
			toast.error(e.message);
		}
	};

	const join = async (name) => {
		const result = await api.post(`/group_orders/${token}/join`, { name });
		const next = saveKeys(token, { participant: result.participant_key });
		setKeys(next);
		setGroup(result.group);
	};

	if (error && !group) {
		return (
			<div className="container page narrow">
				<EmptyState icon={faUserGroup} title={error.status === 404 ? "This group order link doesn't work" : "We couldn't load this group order"}>
					<p>{error.status === 404 ? "Check the link with the person who sent it." : "Please refresh the page."}</p>
					<Link to="/menu" className="btn btn-secondary">
						See the menu
					</Link>
				</EmptyState>
			</div>
		);
	}
	if (!group || !restaurant) return <Spinner label="Loading group order" />;

	if (group.placed) {
		return (
			<div className="container page narrow">
				<EmptyState icon={faCheck} title={`Order #${group.order_number} is in!`}>
					<p>
						{isHost ? "You" : group.host_name} placed the group order. Everyone's name is on their food.
					</p>
					{isHost && group.order && (
						<Link to={`/order/${group.order.token}`} className="btn btn-primary">
							Track the order
						</Link>
					)}
				</EmptyState>
			</div>
		);
	}

	const header = (
		<GroupHeader
			group={group}
			me={mine}
			isHost={isHost}
			restaurantName={restaurant.name}
			justStarted={Boolean(location.state?.justStarted)}
			totalCount={totalCount}
			onOpenCart={() => setCartOpen(true)}
			onJoin={join}
			onSetOpen={setOpen}
			onDone={markDone}
			people={people}
		/>
	);

	return (
		<div className="group-page">
			{canAdd && !finished ? (
				<CartContext.Provider value={groupCart}>
					<MenuPage hero={header} hideFloatingCart />
				</CartContext.Provider>
			) : (
				<div className="menu-hero">
					<div className="container">{header}</div>
				</div>
			)}

			{me && !finished && (
				<button className="floating-cart" onClick={() => setCartOpen(true)}>
					<span className="floating-cart-count">{isHost ? totalCount : mine?.count || 0}</span>
					<span>{isHost ? "Group order" : "Your items"}</span>
					<span className="money">{money(isHost ? totalPrice : mine?.total || 0)}</span>
				</button>
			)}

			{cartOpen && (
				<GroupCartDrawer
					group={group}
					people={people}
					me={mine}
					isHost={isHost}
					totalPrice={totalPrice}
					onChange={changeItem}
					onSetOpen={setOpen}
					onDone={markDone}
					onClose={() => setCartOpen(false)}
				/>
			)}
		</div>
	);
}

function GroupHeader({ group, me, isHost, restaurantName, justStarted, totalCount, onOpenCart, onJoin, onSetOpen, onDone, people: everyone }) {
	const people = group.participants.length;
	const guests = everyone.filter((p) => !p.host);
	const doneCount = guests.filter((p) => p.done).length;
	const allDone = guests.length > 0 && doneCount === guests.length;
	return (
		<div className="group-header">
			<span className="eyebrow">
				<FontAwesomeIcon icon={faUserGroup} /> Group order
			</span>
			<h1>{groupTitle(group)}</h1>
			<ul className="group-facts">
				<li>Organized by {isHost ? "you" : group.host_name}</li>
				{group.deadline_at && (
					<li className={group.past_deadline ? "is-closed" : ""}>
						{group.past_deadline ? "Ordering closed" : "Order by"} {deadlineLabel(group.deadline_at)}
					</li>
				)}
				{group.per_person_limit && <li>Up to {money(group.per_person_limit)} each</li>}
				<li>
					{people} {people === 1 ? "person" : "people"} · {totalCount} item{totalCount === 1 ? "" : "s"}
				</li>
				{isHost && guests.length > 0 && (
					<li className={allDone ? "is-done" : ""}>
						{doneCount} of {guests.length} done
					</li>
				)}
			</ul>

			{isHost && allDone && group.open && (
				<div className="notice notice-success group-ready">
					<FontAwesomeIcon icon={faCheck} />
					<span>
						Everyone's done.{" "}
						<Link to={`/group/${group.token}/checkout`} className="link-btn">
							Check out for everyone
						</Link>
					</span>
				</div>
			)}

			{isHost && <SharePanel group={group} restaurantName={restaurantName} highlight={justStarted} />}

			{!me && group.accepting_items && <JoinForm group={group} onJoin={onJoin} />}
			{!group.accepting_items && !isHost && (
				<div className="notice group-closed">
					<FontAwesomeIcon icon={faLock} /> {closedText(group)}
				</div>
			)}
			{isHost && !group.open && (
				<div className="notice group-closed">
					<FontAwesomeIcon icon={faLock} /> Ordering is closed, so people can't change their items.{" "}
					<button className="link-btn" onClick={() => onSetOpen(true)}>
						Reopen ordering
					</button>
				</div>
			)}
			{me && !isHost && me.done && group.accepting_items && <DoneCard group={group} me={me} onChange={() => onDone(false)} />}
			{me && !isHost && !(me.done && group.accepting_items) && (
				<div className="group-you">
					<p>
						You're ordering as <strong>{me.name}</strong>. Your name goes on everything you add.{" "}
						<button className="link-btn" onClick={onOpenCart}>
							See the group order
						</button>
					</p>
					{group.accepting_items && me.count > 0 && (
						<button className="btn btn-primary" onClick={() => onDone(true)}>
							<FontAwesomeIcon icon={faCheck} /> I'm done
						</button>
					)}
				</div>
			)}
		</div>
	);
}

// "You're all set": what they ordered, and a way back to the menu.
function DoneCard({ group, me, onChange }) {
	const host = group.host_name.split(" ")[0];
	return (
		<div className="group-done card">
			<span className="group-done-icon">
				<FontAwesomeIcon icon={faCheck} />
			</span>
			<div>
				<h2>You're all set, {me.name.split(" ")[0]}!</h2>
				<p className="muted">
					{host} will place the order
					{group.deadline_at ? ` after ${deadlineLabel(group.deadline_at)}` : ""}. Your name will be on your food.
				</p>
				<ul className="group-done-items">
					{me.items.map((i) => (
						<li key={i.id}>
							{i.quantity} × {i.name}
							{i.options_label && <span className="muted small"> · {i.options_label}</span>}
						</li>
					))}
				</ul>
				<button className="link-btn" onClick={onChange}>
					Change my order
				</button>
			</div>
		</div>
	);
}

function closedText(group) {
	if (group.expired) return "This group order link has expired.";
	if (group.past_deadline) return `Ordering closed ${deadlineLabel(group.deadline_at)}.`;
	return `${group.host_name} closed ordering and is placing the order.`;
}

function SharePanel({ group, restaurantName, highlight }) {
	const [copied, setCopied] = useState(false);
	const link = shareUrl(group.token);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(link);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.info("Select the link and copy it.");
		}
	};
	return (
		<div className={`group-share card${highlight ? " is-new" : ""}`}>
			<strong>Invite people with this link</strong>
			<div className="group-share-row">
				<input className="input" readOnly value={link} aria-label="Group order link" onFocus={(e) => e.target.select()} />
				<button type="button" className="btn btn-secondary" onClick={copy}>
					<FontAwesomeIcon icon={copied ? faCheck : faCopy} /> {copied ? "Copied" : "Copy"}
				</button>
				<a className="btn btn-primary" href={inviteMailto(group, restaurantName)}>
					<FontAwesomeIcon icon={faEnvelope} /> Email it
				</a>
			</div>
			<span className="small muted">
				Your private organizer link was emailed to {group.host_email}. It's the one that lets you check out, so keep it to yourself.
			</span>
		</div>
	);
}

function JoinForm({ group, onJoin }) {
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await onJoin(name);
		} catch (err) {
			setError(err.message);
			setBusy(false);
		}
	};
	return (
		<form className="group-join card" onSubmit={submit}>
			<label htmlFor="join-name">
				<strong>{group.host_name.split(" ")[0]} invited you.</strong> What's your name?
			</label>
			<div className="group-share-row">
				<input id="join-name" className="input" required maxLength={40} autoComplete="name" placeholder="e.g. Sarah K."
					value={name} onChange={(e) => setName(e.target.value)} />
				<button className="btn btn-primary" disabled={busy}>
					{busy ? "Joining…" : "Start adding items"}
				</button>
			</div>
			{error && (
				<div className="form-error" role="alert">
					{error}
				</div>
			)}
			<span className="small muted">We write it on your food. {group.host_name.split(" ")[0]} pays for the order.</span>
		</form>
	);
}

function GroupCartDrawer({ group, people, me, isHost, totalPrice, onChange, onSetOpen, onDone, onClose }) {
	useDismiss(onClose);
	const limit = group.per_person_limit ? Number(group.per_person_limit) : null;
	const withItems = people.filter((p) => p.items.length);
	const hasUnavailable = people.some((p) => p.items.some((i) => i.unavailable));
	// You first, then everyone else in the order they joined.
	const ordered = me ? [me, ...withItems.filter((p) => p.id !== me.id)] : withItems;

	return (
		<>
			<div className="drawer-overlay" onClick={onClose} />
			<aside className="drawer group-drawer" role="dialog" aria-modal="true" aria-label="Group order">
				<div className="drawer-head">
					<h3>{groupTitle(group)}</h3>
					<button className="icon-btn" onClick={onClose} aria-label="Close">
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</div>

				<div className="drawer-lines group-people">
					{ordered.map((person) => {
						const isMe = person.id === me?.id;
						const canEdit = isHost || (isMe && group.accepting_items);
						return (
							<section key={person.id} className="group-person">
								<div className="group-person-head">
									<strong>
										{person.name}
										{isMe && " (you)"}
										{person.host && !isMe && " (organizer)"}
										{!person.host && (
											<span className={`group-status${person.done ? " is-done" : ""}`}>
												{person.done ? (
													<>
														<FontAwesomeIcon icon={faCheck} /> Done
													</>
												) : (
													"Still choosing"
												)}
											</span>
										)}
									</strong>
									{(isMe || isHost) && (
										<span className="money">
											{money(person.total)}
											{limit && !person.host && <span className="muted small"> of {money(limit)}</span>}
										</span>
									)}
								</div>
								{person.items.length === 0 && <p className="muted small">Nothing yet. Add something from the menu.</p>}
								<ul>
									{person.items.map((item) => (
										<li key={item.id} className={`cart-line${item.unavailable ? " is-unavailable" : ""}`}>
											<DishImage src={item.image} name={item.name} className="cart-line-img" />
											<div className="cart-line-info">
												<div className="cart-line-top">
													<span>
														{!canEdit && `${item.quantity} × `}
														{item.name}
													</span>
													{(isMe || isHost) && <span className="money">{money(item.total)}</span>}
												</div>
												{item.options_label && <p className="cart-line-options">{item.options_label}</p>}
												{item.special_request && <p className="cart-line-note">“{item.special_request}”</p>}
												{item.unavailable && <p className="cart-line-warn">Sold out, please remove</p>}
												{canEdit && (
													<div className="cart-line-actions">
														<QuantityStepper small min={0} value={item.quantity} onChange={(q) => onChange(item, q)}
															label={`Quantity of ${item.name}`} />
														<button className="icon-btn" onClick={() => onChange(item, 0)} aria-label={`Remove ${item.name}`}>
															<FontAwesomeIcon icon={faTrashCan} />
														</button>
													</div>
												)}
											</div>
										</li>
									))}
								</ul>
							</section>
						);
					})}
					{ordered.length === 0 && <p className="muted">Nobody has added anything yet.</p>}
				</div>

				<div className="drawer-foot">
					{isHost ? (
						<>
							<div className="summary-row">
								<span>Subtotal · {withItems.length} {withItems.length === 1 ? "person" : "people"}</span>
								<strong className="money">{money(totalPrice)}</strong>
							</div>
							<p className="small muted">Tax and tip are added at checkout. Ordering closes when you check out.</p>
							<Link
								to={`/group/${group.token}/checkout`}
								className={`btn btn-primary btn-lg btn-block${!withItems.length || hasUnavailable ? " is-disabled" : ""}`}
								aria-disabled={!withItems.length || hasUnavailable}
								onClick={(e) => (!withItems.length || hasUnavailable) && e.preventDefault()}
							>
								Check out for everyone
							</Link>
							<button className="btn btn-ghost btn-block" onClick={() => onSetOpen(!group.open)}>
								{group.open ? "Close ordering" : "Reopen ordering"}
							</button>
						</>
					) : (
						<>
							{group.accepting_items && me?.count > 0 && !me.done && (
								<button className="btn btn-primary btn-lg btn-block" onClick={() => onDone(true)}>
									<FontAwesomeIcon icon={faCheck} /> I'm done
								</button>
							)}
							<p className="small muted">
								When you're done, tap I'm done so they know. {group.host_name.split(" ")[0]} checks out and pays for
								everyone
								{group.deadline_at && !group.past_deadline ? ` after ${deadlineLabel(group.deadline_at)}` : ""}.
							</p>
						</>
					)}
				</div>
			</aside>
		</>
	);
}
