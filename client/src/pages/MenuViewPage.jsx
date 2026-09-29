import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faFilePdf, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { useRestaurant } from "../context/RestaurantContext";
import { EmptyState, Spinner } from "../components/ui";
import { money } from "../format";

// A read-only menu for people who just want to look, styled like the printed
// dine-in menu. Built from the live menu, so prices always match online ordering.

const LEFT_OUT = new Set(["Bottled Drinks", "Snacks"]); // too long for a menu; they're on the order page
const EYEBROWS = {
	Appetizers: "Mezze",
	Plates: "From the grill",
	Wraps: "Rolled in lavash",
	Salads: "Fresh & crisp",
	Burgers: "Off the griddle",
	"Grilled Sandwiches": "Hot off the grill",
	"Cold Sandwiches": "From the deli",
	Kids: "For the little ones",
	Sides: "On the side",
	Soup: "Made daily",
	Drinks: "To sip",
	Desserts: "Something sweet",
};

// Printed-menu order; anything else follows in the website's own order.
const ORDER = ["Appetizers", "Plates", "Wraps", "Salads", "Burgers", "Grilled Sandwiches", "Cold Sandwiches",
	"Kids", "Sides", "Soup", "Drinks", "Desserts"];
const rank = (name) => (ORDER.includes(name) ? ORDER.indexOf(name) : ORDER.length);

const price = (value) => money(value).replace("$", "");
const cleanDescription = (text) => (text || "").replace(/^Vegetarian\.\s*/, "").trim();

// The text most of a section's items share: a whole description, or else a
// closing sentence (e.g. "Served on lavash bread.").
function mostShared(values, total) {
	const counts = {};
	values.forEach((v) => v && (counts[v] = (counts[v] || 0) + 1));
	const [text, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
	return text && count >= 3 && count >= total * 0.6 ? text : "";
}
const lastSentence = (text) => text.match(/[^.]+\.\s*$/)?.[0].trim() || "";

// Text shared by most of a section is shown once under the section name
// instead of under every item.
function prepareSection(category) {
	let items = category.items.map((item) => ({ ...item, desc: cleanDescription(item.description) }));
	let shared = mostShared(items.map((i) => i.desc), items.length);
	if (shared) {
		items = items.map((i) => (i.desc === shared ? { ...i, desc: "" } : i));
	} else {
		shared = mostShared(items.map((i) => lastSentence(i.desc)), items.length);
		if (shared) {
			items = items.map((i) => (lastSentence(i.desc) === shared ? { ...i, desc: i.desc.slice(0, -shared.length).trim() } : i));
		}
	}
	return { ...category, shared, items };
}

function Item({ item }) {
	const pickTwo = item.modifier_groups?.some((g) => g.min >= 2);
	const sizes = item.sizes?.length ? item.sizes.map((s) => `${s.name} ${price(s.price)}`).join(" · ") : null;
	return (
		<div className="mv-item">
			<div className="mv-line">
				<span className="mv-name">{item.name}</span>
				{item.vegetarian && (
					<span className="mv-veg" title="Vegetarian" aria-label="Vegetarian">
						V
					</span>
				)}
				{pickTwo && <span className="mv-tag">Pick two</span>}
				<span className="mv-dots" aria-hidden="true" />
				<span className="mv-price">{sizes || price(item.price)}</span>
			</div>
			{item.desc && <p className="mv-desc">{item.desc}</p>}
		</div>
	);
}

function SizeTable({ items }) {
	const sizeNames = items[0].sizes.map((s) => s.name);
	return (
		<table className="mv-sizes">
			<thead>
				<tr>
					<th scope="col">
						<span className="sr-only">Item</span>
					</th>
					{sizeNames.map((n) => (
						<th key={n} scope="col">
							{n}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{items.map((i) => (
					<tr key={i.id}>
						<th scope="row">{i.name}</th>
						{i.sizes.map((s) => (
							<td key={s.name}>{price(s.price)}</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}

function Section({ category }) {
	// Items sold in the same set of sizes (like sides by the pint) read best as a table.
	const sized = category.items.filter((i) => i.sizes?.length);
	const sameSizes = (i) => i.sizes.map((s) => s.name).join() === sized[0]?.sizes.map((s) => s.name).join();
	const useTable = sized.length >= 2 && sized.every(sameSizes);
	const rest = useTable ? category.items.filter((i) => !i.sizes?.length) : category.items;
	return (
		<section className="mv-section" id={`mv-${category.id}`}>
			{EYEBROWS[category.name] && <span className="mv-eyebrow">{EYEBROWS[category.name]}</span>}
			<h2>{category.name}</h2>
			{category.shared && <p className="mv-note">{category.shared}</p>}
			{useTable && <SizeTable items={sized} />}
			{rest.map((item) => (
				<Item key={item.id} item={item} />
			))}
		</section>
	);
}

export default function MenuViewPage() {
	const { menu, error } = useRestaurant();

	if (error && !menu) {
		return (
			<div className="container page">
				<EmptyState icon={faUtensils} title="We couldn't load the menu">
					<p>Please refresh the page, or download the PDF menu below.</p>
					<a className="btn btn-secondary" href="/menus/mardinis-menu.pdf">
						Download PDF menu
					</a>
				</EmptyState>
			</div>
		);
	}
	if (!menu) return <Spinner label="Loading menu" />;

	const sections = menu
		.filter((c) => !LEFT_OUT.has(c.name) && c.items.length)
		.sort((a, b) => rank(a.name) - rank(b.name))
		.map(prepareSection);

	return (
		<div className="container page menu-view">
			<header className="mv-header">
				<span className="eyebrow">Our menu</span>
				<h1>Mediterranean & deli favorites</h1>
				<p>Prices before tax. Items marked V are vegetarian.</p>
				<div className="mv-actions">
					<Link to="/menu" className="btn btn-primary">
						<FontAwesomeIcon icon={faBagShopping} /> Order online
					</Link>
					<a className="btn btn-secondary" href="/menus/mardinis-menu.pdf" target="_blank" rel="noreferrer">
						<FontAwesomeIcon icon={faFilePdf} /> Download PDF
					</a>
				</div>
				<nav className="mv-jump" aria-label="Menu sections">
					{sections.map((c) => (
						<a key={c.id} href={`#mv-${c.id}`} className="chip">
							{c.name}
						</a>
					))}
				</nav>
			</header>

			<div className="mv-columns">
				{sections.map((c) => (
					<Section key={c.id} category={c} />
				))}
			</div>

			<p className="mv-footnote">
				Bottled drinks and snacks are available too. See them when you <Link to="/menu">order online</Link>.
			</p>
		</div>
	);
}
