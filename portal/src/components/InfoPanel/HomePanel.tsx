export const HomePanel = () => {
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
                    <div className="context-data default active">
                        <div className="context-header">
                            <h2 className="strong">
                                Open Source vs Enterprise
                            </h2>
                        </div>
                        <div className="context-expand">
                            <p>
                                This is the Open Source Developer Platform,
                                which includes the Form &amp; API platform. Some
                                features are only available on the enterprise
                                platform. If you are looking for the Enterprise
                                Platform setup and you have a license key,{" "}
                                <a
                                    target="_blank"
                                    href="https://form.io/contact"
                                    rel="noreferrer"
                                >
                                    contact us
                                </a>
                                .
                            </p>
                            <p>
                                If you want to go to market as fast as possible
                                to offload the time and cost of installing,
                                configuring, wiring, and maintaining the
                                platform as well as gain access to the
                                enterprise features,{" "}
                                <a
                                    target="_blank"
                                    href="https://form.io/contact"
                                    rel="noreferrer"
                                >
                                    contact us
                                </a>{" "}
                                to get a license key.
                            </p>
                            <p className="enterprise mclear">
                                This icon incidates a feature only available in
                                our{" "}
                                <span className="strong underline">
                                    enterprise
                                </span>{" "}
                                offerings.
                            </p>
                            <div className="section">
                                <ul>
                                    <li className="enterprise">
                                        <span className="strong">Projects</span>{" "}
                                        are segmented sandboxes that house a set
                                        of forms and resources. By leveraging
                                        projects, you can assign teams to
                                        different projects to limit their access
                                        based on what&apos;s relevant to team
                                        members.
                                    </li>
                                    <li className="enterprise">
                                        <span className="strong">
                                            CORS Configuration:
                                        </span>{" "}
                                        Built-in user-interface to configure
                                        your CORS settings globally.
                                    </li>
                                    <li className="enterprise">
                                        <span className="strong">
                                            Reprting UI:
                                        </span>{" "}
                                        Sort, filter, and visualize your data.
                                    </li>
                                    <li className="enterprise">
                                        <span className="strong">
                                            PDF &amp; PDF+ Servers:
                                        </span>{" "}
                                        Allow users to submit via a PDF document
                                        and receive a PDF of their submission
                                        data.
                                    </li>
                                    <li className="enterprise">
                                        The <span className="strong">Enterprise Form Builder Module</span> enables 
                                        organizations to embed a customizable form-building experience into their 
                                        applications while streamlining integration and empowering 
                                        non-developers to create forms using pre-configured components 
                                        and tailored configuration options.
                                    </li>
                                </ul>
                            </div>
                            <div className="cta-license"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
