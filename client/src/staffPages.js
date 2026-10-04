// Admin and kitchen pages. The analytics beacon (index.html) only loads on
// customer pages, so going from the public site to a staff page does a full
// page load instead of an in-app switch, which leaves the beacon behind.
export const isStaffPath = (path) => /^\/(admin|kitchen)(\/|$)/.test(path);

// Like navigate(path, { replace: true }), but a full load for staff pages.
export function goAfterSignIn(navigate, path) {
	if (isStaffPath(path)) window.location.replace(path);
	else navigate(path, { replace: true });
}
