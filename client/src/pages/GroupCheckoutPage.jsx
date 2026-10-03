import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { CartContext } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { EmptyState, Spinner } from "../components/ui";
import { cents } from "../format";
import { describeItem, keyHeaders, loadKeys, menuIndexOf } from "../groupOrder";
import CheckoutPage from "./CheckoutPage";

// The organizer pays for the whole group: the normal checkout page, fed with
// everyone's items (each with its person's name) instead of the personal bag.
export default function GroupCheckoutPage() {
	const { token } = useParams();
	const { menu } = useRestaurant();
	const headers = useMemo(() => keyHeaders(loadKeys(token)), [token]);
	const [group, setGroup] = useState(null);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		try {
			setGroup(await api.get(`/group_orders/${token}`, headers));
		} catch (e) {
			setError(e);
		}
	}, [token, headers]);

	useEffect(() => {
		load();
	}, [load]);

	const menuIndex = useMemo(() => menuIndexOf(menu), [menu]);

	const cart = useMemo(() => {
		if (!group) return null;
		const items = group.participants.flatMap((p) =>
			p.items.map((i) => {
				const d = describeItem(i, menuIndex);
				return {
					key: `group-item-${i.id}`,
					id: i.id,
					menu_item_id: i.menu_item_id,
					name: d.name,
					price: d.unitPrice,
					quantity: i.quantity,
					labels: Array(i.quantity).fill(p.name),
					fixedNames: true,
					options_label: d.options_label,
					special_request: i.special_request,
					image: d.image,
					unavailable: Boolean(menu) && d.unavailable,
				};
			})
		);
		const change = async (key, quantity) => {
			const item = items.find((l) => l.key === key);
			const path = `/group_orders/${token}/items/${item.id}`;
			try {
				setGroup(quantity > 0 ? await api.patch(path, { quantity }, headers) : await api.delete(path, headers));
			} catch (e) {
				toast.error(e.message);
			}
		};
		return {
			items,
			count: items.reduce((n, l) => n + l.quantity, 0),
			subtotal: cents(items.reduce((n, l) => n + l.price * l.quantity, 0)),
			hasUnavailable: items.some((l) => l.unavailable),
			setQuantity: change,
			removeItem: (key) => change(key, 0),
			setLabels: () => {},
			clear: () => {},
			openDrawer: () => {},
			checkout: {
				path: `/group_orders/${token}/checkout`,
				headers,
				contact: { name: group.host_name, phone: group.host_phone || "", email: group.host_email || "" },
				backTo: `/group/${token}`,
				backLabel: "Back to the group order",
				eyebrow: "Group order",
			},
		};
	}, [group, menuIndex, menu, token, headers]);

	if (error) {
		return (
			<div className="container page narrow">
				<EmptyState icon={faUserGroup} title="We couldn't load this group order">
					<p>{error.message}</p>
				</EmptyState>
			</div>
		);
	}
	if (!cart) return <Spinner />;
	if (!group.is_host || group.placed) {
		return (
			<div className="container page narrow">
				<EmptyState icon={faUserGroup} title={group.placed ? "This group order was already placed" : "Only the organizer can check out"}>
					<p>
						{group.placed
							? "Everyone's food is with the kitchen."
							: "Open the organizer link from your email on this device to check out."}
					</p>
					<Link to={`/group/${token}`} className="btn btn-secondary">
						Back to the group order
					</Link>
				</EmptyState>
			</div>
		);
	}

	return (
		<CartContext.Provider value={cart}>
			<CheckoutPage />
		</CartContext.Provider>
	);
}
