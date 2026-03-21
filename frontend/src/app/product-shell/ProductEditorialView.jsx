import { AuthorDeskView } from "../../../../modules/test-modules-editorial/frontend/AuthorDeskView.jsx";

export function ProductEditorialView({ navigate = null, route = {}, collectionsDomain }) {
  return <AuthorDeskView navigate={navigate} route={route} collectionsDomain={collectionsDomain} />;
}
