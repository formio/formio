export const EditPanel = ({ type }: { type: "resource" | "form" }) => {
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
                    <div className="context-data edit-form active">
                        <div className="context-header">
                            <h2 className="strong">
                                Editing{" "}
                                <span className="item-type-label">{name}</span>s
                            </h2>
                        </div>
                        <div className="context-expand">
                            <p>
                                Add, edit, reorder, and remove{" "}
                                <span className="item-type-label">{name}</span>{" "}
                                components.
                            </p>
                            <ul>
                                <li className="enterprise">
                                    <span className="strong">
                                        <span className="item-type-label">
                                            {name}
                                        </span>{" "}
                                        Revisions
                                    </span>
                                    <ul>
                                        <li>
                                            Automatically tracks the history of
                                            form revisions.{" "}
                                            <a
                                                target="_blank"
                                                title="Form Revisions Documentation"
                                                href="https://help.form.io/userguide/forms/form-revisions"
                                                rel="noreferrer"
                                            >
                                                View Documentation
                                            </a>
                                        </li>
                                        <li>
                                            <span className="strong">
                                                Nested Forms
                                            </span>{" "}
                                            and form revisions within the nested
                                            forms.
                                        </li>
                                    </ul>
                                </li>
                                <li className="enterprise">
                                    <span className="strong">
                                        Premium Components
                                    </span>
                                    <ul>
                                        <li>Fully wired file uploads</li>
                                        <li>Dynamic multi-page wizards</li>
                                        <li>Data Sources</li>
                                        <li>reCaptcha</li>
                                        <li>Tagpads</li>
                                        <li>Sketchpads</li>
                                        <li>
                                            Review Pages (summary before
                                            submission)
                                        </li>
                                        <li>Signatures</li>
                                        <li>Custom JSON</li>
                                        <li>Data Tables</li>
                                    </ul>
                                </li>
                                <li className="enterprise">
                                    <span className="strong">
                                        Encrypted fields
                                    </span>
                                </li>
                                <li className="enterprise">
                                    <span className="strong">
                                        Advanced conditional logic
                                    </span>
                                </li>
                            </ul>
                            <div className="section">
                                <p>
                                    We offer 30-day evaluation licenses based on
                                    the{" "}
                                    <a
                                        target="_blank"
                                        href="https://form.io/pricing"
                                        rel="noreferrer"
                                    >
                                        configuration
                                    </a>{" "}
                                    of your choice. Contact us to get started.
                                </p>
                                <div className="button-wrap">
                                    <button
                                        className="button primary open-lightbox"
                                        data-lightbox="contact"
                                    >
                                        Contact Us
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
