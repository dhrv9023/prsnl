import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground px-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-6xl font-bold tracking-tight text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground/60">
          The page <code className="px-1.5 py-0.5 rounded bg-secondary text-xs">{location.pathname}</code> doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
