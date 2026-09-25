import { Link } from "react-router-dom";
import { faUtensils } from "@fortawesome/free-solid-svg-icons";
import { EmptyState } from "../components/ui";

export default function NotFoundPage() {
	return (
		<div className="container page narrow">
			<EmptyState icon={faUtensils} title="This page isn't on the menu">
				<p>The page you're looking for doesn't exist or has moved.</p>
				<div className="row" style={{ justifyContent: "center" }}>
					<Link to="/" className="btn btn-secondary">
						Home
					</Link>
					<Link to="/menu" className="btn btn-primary">
						See the menu
					</Link>
				</div>
			</EmptyState>
		</div>
	);
}
