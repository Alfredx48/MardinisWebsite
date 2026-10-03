import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import { quantityLimit, useCart } from "../context/CartContext";
import { money } from "../format";
import GroupOrderPromo from "./GroupOrderPromo";
import { LineNames } from "./ItemNames";
import { DishImage, EmptyState, QuantityStepper, useDismiss } from "./ui";

export default function CartDrawer() {
	const { drawerOpen, closeDrawer } = useCart();
	if (!drawerOpen) return null;
	return <DrawerContents onClose={closeDrawer} />;
}

function DrawerContents({ onClose }) {
	const { items, subtotal, count, setQuantity, removeItem, hasUnavailable } = useCart();
	const navigate = useNavigate();
	useDismiss(onClose);

	const go = (path) => {
		onClose();
		navigate(path);
	};

	return (
		<>
			<div className="drawer-overlay" onClick={onClose} />
			<aside className="drawer" role="dialog" aria-modal="true" aria-label="Your order">
				<div className="drawer-head">
					<h3>Your order</h3>
					<button className="icon-btn" onClick={onClose} aria-label="Close cart">
						<FontAwesomeIcon icon={faXmark} />
					</button>
				</div>

				{items.length === 0 ? (
					<div className="drawer-empty">
						<EmptyState icon={faBagShopping} title="Your bag is empty">
							<p>Add a few favorites from the menu to get started.</p>
							<button className="btn btn-primary" onClick={() => go("/menu")}>
								Browse the menu
							</button>
						</EmptyState>
					</div>
				) : (
					<>
						<ul className="drawer-lines">
							{items.map((line) => (
								<li key={line.key} className={`cart-line${line.unavailable ? " is-unavailable" : ""}`}>
									<DishImage src={line.image} name={line.name} className="cart-line-img" />
									<div className="cart-line-info">
										<div className="cart-line-top">
											<strong>{line.name}</strong>
											<span className="money">{money(line.price * line.quantity)}</span>
										</div>
										{line.options_label && <p className="cart-line-options">{line.options_label}</p>}
										{line.special_request && <p className="cart-line-note">“{line.special_request}”</p>}
										{!line.unavailable && <LineNames line={line} />}
										{line.needsOptions ? (
											<p className="cart-line-warn">
												This dish's options changed.{" "}
												<button
													className="link-btn"
													onClick={() => {
														removeItem(line.key);
														go(`/menu?item=${line.menu_item_id}`);
													}}
												>
													Choose options
												</button>
											</p>
										) : (
											line.unavailable && <p className="cart-line-warn">Sold out, please remove</p>
										)}
										<div className="cart-line-actions">
											<QuantityStepper
												small
												value={line.quantity}
												min={0}
												max={quantityLimit(line)}
												onChange={(q) => setQuantity(line.key, q)}
												label={`Quantity of ${line.name}`}
											/>
											<button
												className="icon-btn"
												onClick={() => removeItem(line.key)}
												aria-label={`Remove ${line.name}`}
											>
												<FontAwesomeIcon icon={faTrashCan} />
											</button>
										</div>
									</div>
								</li>
							))}
						</ul>
						<div className="drawer-foot">
							<div className="summary-row">
								<span>
									Subtotal · {count} item{count === 1 ? "" : "s"}
								</span>
								<strong className="money">{money(subtotal)}</strong>
							</div>
							<p className="small muted">Tax and tip are calculated at checkout.</p>
							<button
								className="btn btn-primary btn-lg btn-block"
								onClick={() => go("/checkout")}
								disabled={hasUnavailable}
							>
								Checkout
							</button>
							<button className="btn btn-ghost btn-block" onClick={() => go("/menu")}>
								Keep browsing
							</button>
							<GroupOrderPromo onStart={onClose} />
						</div>
					</>
				)}
			</aside>
		</>
	);
}
