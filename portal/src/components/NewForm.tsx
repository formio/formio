import { FormEdit, FormType } from "@formio/react";
import { useHashLocation } from "wouter/use-hash-location";
import { useBodyClassName } from "../hooks/useBodyClassName";

export const NewForm = ({ type }: { type: "form" | "resource" }) => {
    useBodyClassName(`item-open`);
    const name = type === "form" ? "Form" : "Resource";
    const setLocation = useHashLocation()[1];

    const handleSaveForm = async (form: FormType) => {
        setLocation(`/${type}/${form._id}`);
    };

    return (
        <div
            className={`panel-wrap content fio-card remember-focus-content new-item active ${type}`}
        >
            <div className="panel-header">
                <div className="panel-header-section top">
                    <div className="panel-title icon">
                        <img src={`icon-${type}.svg`} alt={`${type} Icon`} />{" "}
                        New {name}
                    </div>
                    <button
                        className="close-button close-item transition last-focused"
                        onClick={() => setLocation("/")}
                    >
                        <i className="ri-close-line"></i>
                    </button>
                </div>
            </div>
            <div className="panel new-item">
                <FormEdit
                    onSaveForm={(form) => handleSaveForm(form)}
                    components={{
                        SettingsFormContainer: ({ children }) => (
                            <div className="edit-form-header">{children}</div>
                        ),
                        BuilderContainer: ({ children }) => (
                            <div style={{ padding: "15px" }}>{children}</div>
                        ),
                        SaveButtonContainer: ({ children }) => (
                            <div
                                className="save-form-bar button-wrap"
                                style={{ justifyContent: "end" }}
                            >
                                {children}
                            </div>
                        ),
                        SaveButton: ({ onClick }) => (
                            <button
                                className="button save-form"
                                onClick={onClick}
                            >
                                Create {name}
                            </button>
                        ),
                    }}
                    initialForm={{
                        display: 'form',
                        type,
                        components: [],
                    }}
                />
            </div>
        </div>
    );
};
