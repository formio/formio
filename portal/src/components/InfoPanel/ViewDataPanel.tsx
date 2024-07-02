export const ViewDataPanel = () => {
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
                    <div className="context-data view-data active">
                        <div className="context-header">
                            <h2 className="strong">Viewing Submission Data</h2>
                        </div>
                        <div className="context-expand">
                            <p>
                                Data can be viewed, edited, and deleted from
                                here as well as exported to JSON or CSV.
                            </p>
                            <ul>
                                <li className="enterprise">
                                    <span className="strong">
                                        Submission revisions
                                    </span>{" "}
                                    are shown in context of each submission
                                </li>
                                <li className="enterprise">
                                    <span className="strong">Print to PDF</span>{" "}
                                    export option
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
