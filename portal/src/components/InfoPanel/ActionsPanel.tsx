import { EvaluationLicenseInfo } from "./Partials/EvaluationLicenseInfo";

export const ActionsPanel = ({ type }: { type: "form" | "resource" }) => {
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
                    <div className="context-data form-actions active">
                        <div className="context-header">
                            <h2 className="strong">
                                <span className="item-type-label">{name}</span>{" "}
                                Actions
                            </h2>
                        </div>
                        <div className="context-expand">
                            <p>
                                Configure actions that will execute upon
                                submission.
                            </p>
                            <ul>
                                <li className="enterprise">
                                    <span className="strong">
                                        Premium Actions
                                    </span>
                                    <ul>
                                        <li>Easy integrations</li>
                                        <li>Role Assignments</li>
                                        <li>2FA</li>
                                        <li>Google Sheets Integration</li>
                                        <li>SQL Connector</li>
                                        <li>
                                            Pre-configured, most-used actions
                                        </li>
                                    </ul>
                                </li>
                                <li className="enterprise">
                                    <span className="strong">Email Action</span>{" "}
                                    dynamically updated after Email Sending
                                    Provider is setup.
                                </li>
                                <li className="enterprise">
                                    <span className="strong">Logs</span> of each
                                    action that&apos;s executed, who, what, and
                                    when they did it.
                                </li>
                                <li className="enterprise">
                                    Built-in{" "}
                                    <span className="strong">
                                        user authentication
                                    </span>
                                    , including OAuth, SAML, and more.
                                </li>
                            </ul>
                            <EvaluationLicenseInfo/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
