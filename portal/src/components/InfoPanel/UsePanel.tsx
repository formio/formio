import { EvaluationLicenseInfo } from "./Partials/EvaluationLicenseInfo";

export const UsePanel = ({ type }: { type: "form" | "resource" }) => {
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
                    <div className="context-data forms enter-data active">
                        <div className="context-header">
                            <h2 className="strong">
                                Using{" "}
                                <span className="item-type-label">{name}</span>s
                            </h2>
                        </div>
                        <div className="context-expand">
                            <p>
                                The visual rendering of this{" "}
                                <span className="item-type-label">{name}</span>.
                                You can enter data directly from here as well.
                            </p>
                            <ul>
                                <li className="enterprise">
                                    <span className="strong">
                                        Submission logs
                                    </span>
                                    .
                                </li>
                                <li className="enterprise">
                                    The{" "}
                                    <span className="strong">
                                        Developer Portal
                                    </span>{" "}
                                    provides{" "}
                                    <span className="strong">
                                        inline documentation
                                    </span>{" "}
                                    about embedding forms/resources.{" "}
                                    <span className="item-type-label">
                                        {name}
                                    </span>
                                    s are rendered via an API call to your
                                    commericial deployment.
                                </li>
                                <li className="enterprise">
                                    Quick inline{" "}
                                    <span className="strong">embed script</span>{" "}
                                    for easy embedding. Example:
                                    <br />
                                    <pre>
                                        &lt;script
                                        src=&quot;https://portal.form.io/formio.renderer.min.js?src=https://boohnyojfdxqj1so.form.io/stage1intakeform&amp;libs=true&quot;&gt;&lt;/script&gt;
                                    </pre>
                                </li>
                                <li className="enterprise">
                                    One-click launch button to create a{" "}
                                    <span className="strong">
                                        single page application
                                    </span>{" "}
                                    of this{" "}
                                    <span className="item-type-label">
                                        Resource
                                    </span>
                                    .
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
