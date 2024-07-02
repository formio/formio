export const AccessPanel = ({ type }: { type: "form" | "resource" }) => {
    const name = type === "form" ? "Form" : "Resource";
    return (
        <div className="panel-wrap context default">
            <div className="panel">
                <div className="context-info card">
                    <button className="show-more">
                        <i className="ri-arrow-down-s-line"></i>
                        <i className="ri-arrow-up-s-line"></i>
                        <span className="show-more-text more">More</span>
                        <span className="show-more-text less">Less</span>
                    </button>
                    <div className="context-data access active">
                        <div className="context-header">
                            <h2 className="strong">
                                <span className="item-type-label">{name}</span>{" "}
                                Access
                            </h2>
                        </div>
                        <div className="context-expand">
                            <p>
                                Set permissions for this{" "}
                                <span className="item-type-label">{name}</span>.
                            </p>
                            <ul>
                                <li className="enterprise">
                                    Set <span className="strong">roles</span>{" "}
                                    with their own permissions for this{" "}
                                    <span className="item-type-label">
                                        {name}
                                    </span>
                                </li>
                                <li className="enterprise">
                                    Set <span className="strong">roles</span>{" "}
                                    with their own permissions for access to the
                                    Developer Portal itself (the commercial
                                    version of this tool).
                                </li>
                                <li className="enterprise">
                                    <span className="strong">
                                        {name} promotion
                                    </span>{" "}
                                    through development, staging, and production
                                    environments.
                                </li>
                                <li className="enterprise">
                                    Additional{" "}
                                    <span className="strong">No-Code UI</span>{" "}
                                    for a number of features.
                                </li>
                                <li className="enterprise">
                                    Configure{" "}
                                    <span className="strong">teams</span> with
                                    their own permissions for projects that
                                    connect to your own user database that
                                    exists elsewhere.
                                </li>
                            </ul>
                            <div className="cta-license"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
