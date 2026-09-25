import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faArrowDown,
	faArrowUp,
	faEyeSlash,
	faMagnifyingGlass,
	faPen,
	faPepperHot,
	faPlus,
	faStar,
	faTrash,
	faUtensils,
	faLeaf,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { money } from "../format";
import { DishImage, EmptyState, Modal, Spinner, Switch } from "../components/ui";
import { useRestaurant } from "../context/RestaurantContext";
import { ConfirmDialog, FormErrors, OverflowMenu, PageHeader } from "./adminUi";
import { errorList } from "./adminUtils";

/* ---------------------------------------------------------------- editors */
function CategoryEditor({ category, onClose, onSaved }) {
	const [form, setForm] = useState({
		name: category?.name || "",
		description: category?.description || "",
		active: category ? category.active : true,
	});
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState(null);
	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

	const submit = async (e) => {
		e.preventDefault();
		setSaving(true);
		setErrors(null);
		try {
			const saved = category
				? await api.patch(`/admin/categories/${category.id}`, form)
				: await api.post("/admin/categories", form);
			onSaved(saved, !category);
		} catch (err) {
			setErrors(errorList(err));
			setSaving(false);
		}
	};

	return (
		<Modal onClose={onClose} label={category ? "Edit category" : "Add category"} className="adm-modal-md">
			<form onSubmit={submit}>
				<div className="modal-body adm-form">
					<h2 className="adm-modal-title">{category ? "Edit category" : "New category"}</h2>
					<div className="field">
						<label htmlFor="cat-name">Name</label>
						<input id="cat-name" className="input" value={form.name} onChange={set("name")} required autoFocus />
					</div>
					<div className="field">
						<label htmlFor="cat-desc">Description</label>
						<textarea
							id="cat-desc"
							className="textarea"
							rows={2}
							value={form.description}
							onChange={set("description")}
						/>
						<span className="hint">Optional. Shown under the category name on the menu.</span>
					</div>
					<label className="checkbox">
						<input
							type="checkbox"
							checked={form.active}
							onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
						/>
						Show this category on the website
					</label>
					<FormErrors errors={errors} />
				</div>
				<div className="modal-footer">
					<span className="spacer" />
					<button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
						Cancel
					</button>
					<button type="submit" className="btn btn-primary" disabled={saving}>
						{saving ? "Saving…" : category ? "Save" : "Add category"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

function ImagePreview({ url, name }) {
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [url]);
	const valid = /^https?:\/\/\S+$/.test(url);
	if (!valid) {
		return (
			<div className="adm-img-preview">
				<DishImage name={name || "New item"} />
				<span className="adm-img-caption">{url ? "Enter a full link starting with https://" : "No photo — a placeholder is shown"}</span>
			</div>
		);
	}
	return (
		<div className="adm-img-preview">
			{failed ? (
				<div className="adm-img-failed">Couldn't load this image. Check the link.</div>
			) : (
				<img src={url} alt={`Preview of ${name || "item"}`} onError={() => setFailed(true)} />
			)}
		</div>
	);
}

function ItemEditor({ item, categoryId, categories, onClose, onSaved, onDeleted }) {
	const [form, setForm] = useState({
		name: item?.name || "",
		description: item?.description || "",
		price: item?.price || "",
		image: item?.image || "",
		category_id: item?.category_id || categoryId || categories[0]?.id || "",
		featured: item?.featured || false,
		vegetarian: item?.vegetarian || false,
		spicy: item?.spicy || false,
		available: item ? item.available : true,
	});
	const [saving, setSaving] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [errors, setErrors] = useState(null);
	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
	const check = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));

	const submit = async (e) => {
		e.preventDefault();
		setSaving(true);
		setErrors(null);
		const body = { ...form, name: form.name.trim(), image: form.image.trim(), category_id: Number(form.category_id) };
		try {
			const saved = item
				? await api.patch(`/admin/menu_items/${item.id}`, body)
				: await api.post("/admin/menu_items", body);
			onSaved(saved, item);
		} catch (err) {
			setErrors(errorList(err));
			setSaving(false);
		}
	};

	const remove = async () => {
		setSaving(true);
		setErrors(null);
		try {
			await api.delete(`/admin/menu_items/${item.id}`);
			onDeleted(item);
		} catch (err) {
			setErrors(errorList(err));
			setConfirmDelete(false);
			setSaving(false);
		}
	};

	return (
		<Modal onClose={onClose} label={item ? `Edit ${item.name}` : "Add item"} className="adm-modal-lg">
			<form onSubmit={submit}>
				<div className="modal-body adm-form">
					<h2 className="adm-modal-title">{item ? "Edit item" : "New menu item"}</h2>
					<div className="adm-item-form">
						<div className="adm-form">
							<div className="field">
								<label htmlFor="item-name">Name</label>
								<input
									id="item-name"
									className="input"
									value={form.name}
									onChange={set("name")}
									maxLength={80}
									required
									autoFocus={!item}
								/>
							</div>
							<div className="grid-2">
								<div className="field">
									<label htmlFor="item-price">Price ($)</label>
									<input
										id="item-price"
										className="input"
										type="number"
										inputMode="decimal"
										min="0.01"
										max="999.99"
										step="0.01"
										value={form.price}
										onChange={set("price")}
										required
									/>
								</div>
								<div className="field">
									<label htmlFor="item-category">Category</label>
									<select
										id="item-category"
										className="select"
										value={form.category_id}
										onChange={set("category_id")}
									>
										{categories.map((c) => (
											<option key={c.id} value={c.id}>
												{c.name}
												{c.active ? "" : " (hidden)"}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="field">
								<label htmlFor="item-desc">Description</label>
								<textarea
									id="item-desc"
									className="textarea"
									rows={3}
									value={form.description}
									onChange={set("description")}
								/>
							</div>
							<div className="field">
								<label htmlFor="item-image">Photo link</label>
								<input
									id="item-image"
									className="input"
									type="url"
									placeholder="https://…"
									value={form.image}
									onChange={set("image")}
								/>
							</div>
						</div>
						<ImagePreview url={form.image.trim()} name={form.name} />
					</div>

					<fieldset className="adm-fieldset">
						<legend className="label">Labels</legend>
						<div className="adm-checks">
							<label className="checkbox">
								<input type="checkbox" checked={form.featured} onChange={check("featured")} />
								<FontAwesomeIcon icon={faStar} className="adm-ico-featured" /> Featured on home page
							</label>
							<label className="checkbox">
								<input type="checkbox" checked={form.vegetarian} onChange={check("vegetarian")} />
								<FontAwesomeIcon icon={faLeaf} className="adm-ico-veg" /> Vegetarian
							</label>
							<label className="checkbox">
								<input type="checkbox" checked={form.spicy} onChange={check("spicy")} />
								<FontAwesomeIcon icon={faPepperHot} className="adm-ico-spicy" /> Spicy
							</label>
							<label className="checkbox">
								<input type="checkbox" checked={form.available} onChange={check("available")} />
								Available to order
							</label>
						</div>
					</fieldset>
					<FormErrors errors={errors} />
				</div>
				<div className="modal-footer adm-footer-wrap">
					{item &&
						(confirmDelete ? (
							<span className="adm-inline-confirm">
								<span>Delete for good?</span>
								<button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={saving}>
									Yes, delete
								</button>
								<button
									type="button"
									className="btn btn-ghost btn-sm"
									onClick={() => setConfirmDelete(false)}
									disabled={saving}
								>
									No
								</button>
							</span>
						) : (
							<button
								type="button"
								className="btn btn-ghost adm-text-danger"
								onClick={() => setConfirmDelete(true)}
								disabled={saving}
							>
								<FontAwesomeIcon icon={faTrash} /> Delete
							</button>
						))}
					<span className="spacer" />
					<button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
						Cancel
					</button>
					<button type="submit" className="btn btn-primary" disabled={saving}>
						{saving ? "Saving…" : item ? "Save changes" : "Add item"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

/* ------------------------------------------------------------------- rows */
function AvailableToggle({ item, onToggle }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={item.available}
			aria-label={`${item.name} available`}
			className={`adm-avail${item.available ? " is-on" : ""}`}
			onClick={() => onToggle(item)}
		>
			<span className="adm-avail-track" aria-hidden="true" />
			<span className="adm-avail-text">{item.available ? "Available" : "Sold out"}</span>
		</button>
	);
}

function MoveButtons({ index, count, onMove, label }) {
	return (
		<div className="adm-move">
			<button
				type="button"
				className="adm-icon-btn adm-icon-sm"
				onClick={() => onMove(index, -1)}
				disabled={index === 0}
				aria-label={`Move ${label} up`}
			>
				<FontAwesomeIcon icon={faArrowUp} />
			</button>
			<button
				type="button"
				className="adm-icon-btn adm-icon-sm"
				onClick={() => onMove(index, 1)}
				disabled={index === count - 1}
				aria-label={`Move ${label} down`}
			>
				<FontAwesomeIcon icon={faArrowDown} />
			</button>
		</div>
	);
}

function ItemRow({ item, index, count, canMove, onMove, onToggle, onEdit }) {
	return (
		<li className={`adm-item${item.available ? "" : " is-soldout"}`}>
			{canMove && <MoveButtons index={index} count={count} onMove={onMove} label={item.name} />}
			<DishImage src={item.image} name={item.name} className="adm-item-thumb" />
			<div className="adm-item-main">
				<div className="adm-item-name">{item.name}</div>
				<div className="adm-item-meta">
					<span className="money">{money(item.price)}</span>
					{item.featured && (
						<span className="badge badge-terracotta">
							<FontAwesomeIcon icon={faStar} /> Featured
						</span>
					)}
					{item.vegetarian && (
						<span className="badge badge-olive">
							<FontAwesomeIcon icon={faLeaf} /> Vegetarian
						</span>
					)}
					{item.spicy && (
						<span className="badge badge-danger">
							<FontAwesomeIcon icon={faPepperHot} /> Spicy
						</span>
					)}
				</div>
			</div>
			<AvailableToggle item={item} onToggle={onToggle} />
			<button type="button" className="adm-icon-btn" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
				<FontAwesomeIcon icon={faPen} />
			</button>
		</li>
	);
}

/* ------------------------------------------------------------------- page */
export default function MenuManager() {
	const { refresh } = useRestaurant();
	const [categories, setCategories] = useState(null);
	const [error, setError] = useState(null);
	const [search, setSearch] = useState("");
	const [onlyUnavailable, setOnlyUnavailable] = useState(false);
	const [itemEditor, setItemEditor] = useState(null); // { item?, categoryId? }
	const [categoryEditor, setCategoryEditor] = useState(null); // { category? }
	const [deleting, setDeleting] = useState(null);

	const load = useCallback(async () => {
		try {
			setCategories(await api.get("/admin/categories"));
			setError(null);
		} catch (e) {
			setError(e);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const changed = useCallback(() => refresh(), [refresh]);

	const updateItemLocal = (id, changes) =>
		setCategories((cs) =>
			cs.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }))
		);

	const toggleAvailable = async (item) => {
		const available = !item.available;
		updateItemLocal(item.id, { available });
		try {
			const saved = await api.patch(`/admin/menu_items/${item.id}`, { available });
			updateItemLocal(item.id, saved);
			toast.success(available ? `${item.name} is available again` : `${item.name} marked sold out`, {
				autoClose: 1800,
			});
			changed();
		} catch (e) {
			updateItemLocal(item.id, { available: item.available });
			toast.error(e.message);
		}
	};

	const toggleCategory = async (category, active) => {
		setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, active } : c)));
		try {
			await api.patch(`/admin/categories/${category.id}`, { active });
			toast.success(active ? `${category.name} is visible` : `${category.name} hidden from the menu`, {
				autoClose: 1800,
			});
			changed();
		} catch (e) {
			setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, active: category.active } : c)));
			toast.error(e.message);
		}
	};

	const moveCategory = async (index, dir) => {
		const next = [...categories];
		[next[index], next[index + dir]] = [next[index + dir], next[index]];
		setCategories(next);
		try {
			await api.patch("/admin/categories/reorder", { ids: next.map((c) => c.id) });
			changed();
		} catch (e) {
			toast.error(e.message);
			load();
		}
	};

	const moveItem = async (category, index, dir) => {
		const items = [...category.items];
		[items[index], items[index + dir]] = [items[index + dir], items[index]];
		setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, items } : c)));
		try {
			await api.patch("/admin/menu_items/reorder", { category_id: category.id, ids: items.map((i) => i.id) });
			changed();
		} catch (e) {
			toast.error(e.message);
			load();
		}
	};

	const itemSaved = (saved, original) => {
		setCategories((cs) =>
			cs.map((c) => {
				let items = c.items;
				if (original && original.category_id === c.id && saved.category_id !== c.id) {
					items = items.filter((i) => i.id !== saved.id);
				} else if (original && c.id === saved.category_id && original.category_id === c.id) {
					items = items.map((i) => (i.id === saved.id ? saved : i));
				} else if (c.id === saved.category_id) {
					items = [...items, saved];
				}
				return items === c.items ? c : { ...c, items };
			})
		);
		setItemEditor(null);
		toast.success(original ? `Saved ${saved.name}` : `Added ${saved.name}`);
		changed();
	};

	const itemDeleted = (item) => {
		setCategories((cs) =>
			cs.map((c) => (c.id === item.category_id ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c))
		);
		setItemEditor(null);
		toast.success(`Deleted ${item.name}`);
		changed();
	};

	const categorySaved = (saved, isNew) => {
		setCategories((cs) =>
			isNew ? [...cs, { ...saved, items: saved.items || [] }] : cs.map((c) => (c.id === saved.id ? { ...c, ...saved, items: c.items } : c))
		);
		setCategoryEditor(null);
		toast.success(isNew ? `Added ${saved.name}` : `Saved ${saved.name}`);
		changed();
	};

	const deleteCategory = async () => {
		await api.delete(`/admin/categories/${deleting.id}`);
		setCategories((cs) => cs.filter((c) => c.id !== deleting.id));
		toast.success(`Deleted ${deleting.name}`);
		setDeleting(null);
		changed();
	};

	const soldOutCount = useMemo(
		() => (categories || []).reduce((n, c) => n + c.items.filter((i) => !i.available).length, 0),
		[categories]
	);

	if (!categories) {
		if (error) {
			return (
				<EmptyState title="Couldn't load the menu">
					<p>{error.message}</p>
					<button type="button" className="btn btn-secondary" onClick={load}>
						Try again
					</button>
				</EmptyState>
			);
		}
		return <Spinner label="Loading menu" />;
	}

	const term = search.trim().toLowerCase();
	const filtering = term !== "" || onlyUnavailable;
	const matches = (i) => (!term || i.name.toLowerCase().includes(term)) && (!onlyUnavailable || !i.available);
	const visible = categories
		.map((c) => ({ category: c, items: filtering ? c.items.filter(matches) : c.items }))
		.filter(({ items }) => !filtering || items.length > 0);

	return (
		<div className="adm-page">
			<PageHeader title="Menu" subtitle="Tap “Available” to mark a dish sold out. Changes show on the website right away.">
				<button type="button" className="btn btn-secondary" onClick={() => setCategoryEditor({})}>
					<FontAwesomeIcon icon={faPlus} />
					Add category
				</button>
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => setItemEditor({})}
					disabled={categories.length === 0}
				>
					<FontAwesomeIcon icon={faPlus} />
					Add item
				</button>
			</PageHeader>

			<div className="adm-toolbar">
				<div className="adm-search">
					<FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
					<label className="sr-only" htmlFor="menu-search">
						Search dishes
					</label>
					<input
						id="menu-search"
						className="input"
						type="search"
						placeholder="Search dishes"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<button
					type="button"
					className="adm-chip"
					aria-pressed={onlyUnavailable}
					onClick={() => setOnlyUnavailable((v) => !v)}
				>
					Only sold out ({soldOutCount})
				</button>
			</div>

			{categories.length === 0 ? (
				<EmptyState icon={faUtensils} title="Your menu is empty">
					<p>Start by adding a category such as “Sandwiches”.</p>
					<button type="button" className="btn btn-primary" onClick={() => setCategoryEditor({})}>
						Add category
					</button>
				</EmptyState>
			) : visible.length === 0 ? (
				<EmptyState icon={faMagnifyingGlass} title="No matching dishes">
					<p>{onlyUnavailable ? "Everything matching is available." : "Try a different search."}</p>
				</EmptyState>
			) : (
				<div className="adm-stack">
					{visible.map(({ category, items }) => {
						const index = categories.indexOf(category);
						return (
							<section
								key={category.id}
								className={`card adm-category${category.active ? "" : " is-hidden"}`}
								aria-labelledby={`cat-${category.id}`}
							>
								<header className="adm-category-head">
									{!filtering && (
										<MoveButtons
											index={index}
											count={categories.length}
											onMove={moveCategory}
											label={category.name}
										/>
									)}
									<div className="adm-category-title">
										<h2 id={`cat-${category.id}`}>
											{category.name}
											{!category.active && (
												<span className="badge">
													<FontAwesomeIcon icon={faEyeSlash} /> Hidden
												</span>
											)}
										</h2>
										{category.description && <p className="muted small">{category.description}</p>}
									</div>
									<div className="adm-visible">
										<span className="small" aria-hidden="true">
											Visible
										</span>
										<Switch
											checked={category.active}
											onChange={(v) => toggleCategory(category, v)}
											label={`Show ${category.name} on the website`}
										/>
									</div>
									<OverflowMenu
										label={`${category.name} options`}
										items={[
											{ label: "Edit name & description", icon: faPen, onClick: () => setCategoryEditor({ category }) },
											{ label: "Add item here", icon: faPlus, onClick: () => setItemEditor({ categoryId: category.id }) },
											{ label: "Delete category", icon: faTrash, danger: true, onClick: () => setDeleting(category) },
										]}
									/>
								</header>
								{items.length === 0 ? (
									<div className="adm-category-empty">
										<span className="muted">No items yet.</span>
										<button
											type="button"
											className="btn btn-sm btn-secondary"
											onClick={() => setItemEditor({ categoryId: category.id })}
										>
											<FontAwesomeIcon icon={faPlus} /> Add item
										</button>
									</div>
								) : (
									<ul className="adm-items">
										{items.map((item, i) => (
											<ItemRow
												key={item.id}
												item={item}
												index={i}
												count={items.length}
												canMove={!filtering}
												onMove={(idx, dir) => moveItem(category, idx, dir)}
												onToggle={toggleAvailable}
												onEdit={(it) => setItemEditor({ item: it })}
											/>
										))}
									</ul>
								)}
							</section>
						);
					})}
				</div>
			)}

			{itemEditor && (
				<ItemEditor
					item={itemEditor.item}
					categoryId={itemEditor.categoryId}
					categories={categories}
					onClose={() => setItemEditor(null)}
					onSaved={itemSaved}
					onDeleted={itemDeleted}
				/>
			)}
			{categoryEditor && (
				<CategoryEditor
					category={categoryEditor.category}
					onClose={() => setCategoryEditor(null)}
					onSaved={categorySaved}
				/>
			)}
			{deleting && (
				<ConfirmDialog
					title={`Delete “${deleting.name}”?`}
					confirmLabel="Delete category"
					danger
					onConfirm={deleteCategory}
					onClose={() => setDeleting(null)}
				>
					{deleting.items.length > 0 ? (
						<p>
							This category still has {deleting.items.length} {deleting.items.length === 1 ? "item" : "items"}. Move or
							delete them first, or just hide the category instead.
						</p>
					) : (
						<p>This removes the empty category from your menu.</p>
					)}
				</ConfirmDialog>
			)}
		</div>
	);
}
