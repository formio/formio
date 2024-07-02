const Header = () => {
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <a className="navbar-brand" href="/">
                <img
                    src="logo-formio-horizontal-lightbg.svg"
                    width={100}
                    height={50}
                    alt="logo"
                />
            </a>
            <div className="collapse navbar-collapse justify-content-end">
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <button className="nav-link btn btn-link">
                            Info Panel
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className="nav-link btn btn-link">
                            Logout
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Header;
