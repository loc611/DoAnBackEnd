import { Navigate, Outlet, useLocation } from 'react-router-dom';

const PrivateRoute = () => {
    const token = localStorage.getItem('token');
    const location = useLocation();

    if (!token) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
