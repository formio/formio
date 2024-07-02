import { Form } from "@formio/react";

export function Login() {
    return (
        <div className="login-wrap">
            <div className="login-inside card">
                <a href="index.html" className="logo">
                    <img src="logo-formio-horizontal-lightbg.svg" alt="" />
                </a>
                <h1 className="portal-title">Open Source Developer Portal</h1>
                <Form src={"/admin/login"} />
                <div className="login-help-wrap">
                    <p>
                        <span className="strong">Admin / First Time Login</span>
                        : Use the account that was created during installation.
                    </p>
                    <p>
                        Additional accounts are created by logging in with the
                        admin account and adding an entry to the{" "}
                        <span className="strong">Admin</span> resource.
                    </p>
                </div>
                <div className="login-help-wrap">
                    <a
                        target="_blank"
                        href="https://help.form.io/"
                        className="link"
                        rel="noreferrer"
                    >
                        Form.io Help Documentation
                    </a>
                    <br />
                    <a
                        target="_blank"
                        href="https://help.form.io/developers/javascript-development/javascript-sdk"
                        className="link"
                        rel="noreferrer"
                    >
                        Form.io SDK / Renderer Documentation
                    </a>
                </div>
            </div>
        </div>
    );
}
