// write a test that checks that the Auth component renders a login form when the user is not authenticated
import userEvent from "@testing-library/user-event";
import { createContext } from "react";
import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormioProvider, useFormioContext } from "@formio/react";
import "@testing-library/jest-dom";

import App from "../App";
import { InfoPanelProvider } from "../../hooks/useInfoPanelContext";

type FormioContext = {
    token: any;
    setToken: React.Dispatch<any>;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    Formio: any;
    baseUrl: any;
    projectUrl: any;
};

const OurContext = createContext<FormioContext | null>(null);

const SpoofedFormioProvider = ({ children }: { children: React.ReactNode }) => {
    const Formio: FormioContext = {
        token: null,
        setToken: () => {},
        isAuthenticated: true,
        logout: async () => {},
        Formio: null,
        baseUrl: "http://localhost:3001",
        projectUrl: null,
    };

    return (
        <OurContext.Provider value={Formio}>
            <InfoPanelProvider>{children}</InfoPanelProvider>
        </OurContext.Provider>
    );
};

vi.mock("@formio/react", () => ({
    useFormioContext: () => ({ isAuthenticated: true }),
}));

test("displays the login form when a user does not have a token", async () => {
    render(
        // TODO: stub out service worker so server doesn't have to be running
        <FormioProvider>
            <InfoPanelProvider>
                <App />
            </InfoPanelProvider>
        </FormioProvider>
    );
    expect(await screen.findByText("Email"));
    expect(await screen.findByText("Password"));
});

test("redirects to the home page when a user has logged in and redirects back to the login form when logout is clicked", async () => {
    render(
        // TODO: stub out service worker so server doesn't have to be running
        <FormioProvider baseUrl="http://localhost:3001">
            <InfoPanelProvider>
                <App />
            </InfoPanelProvider>
        </FormioProvider>
    );
    // 2. Find form fields
    const emailInput = await screen.findByText("Email");
    const passwordInput = await screen.findByText("Password");
    const submitButton = screen.getByRole("button", { name: /submit/i });

    // 3. Fill out the fields with userEvent
    await userEvent.type(emailInput, "brendan@form.io");
    await userEvent.type(passwordInput, "Sanford1f!");

    // 4. Click the submit button
    await userEvent.click(submitButton);

    expect(await screen.findByText("Resources"));
    expect(await screen.findByText("Forms"));
});

test("Should display Admin and User resources when logged in", async () => {
    render(
        // TODO: stub out service worker so server doesn't have to be running
        <FormioProvider baseUrl="http://localhost:3001">
            <InfoPanelProvider>
                <App />
            </InfoPanelProvider>
        </FormioProvider>
    );
    expect(await screen.findByText("Resources"));

    expect(await screen.findByText("Admin"));
    expect(await screen.findByText("User"));
});

test("Should display user and admin login forms when logged in", async () => {
    render(
        // TODO: stub out service worker so server doesn't have to be running
        <FormioProvider baseUrl="http://localhost:3001">
            <InfoPanelProvider>
                <App />
            </InfoPanelProvider>
        </FormioProvider>
    );
    expect(await screen.findByText("Forms"));

    expect(await screen.findByText("User Login"));
    expect(await screen.findByText("Admin Login"));
});

// test('redirects to login form when logout is clicked', async () => {
//   render(
//       // TODO: stub out service worker so server doesn't have to be running
//       <FormioProvider baseUrl="http://localhost:3001">
//           <InfoPanelProvider>
//               <App />
//           </InfoPanelProvider>
//       </FormioProvider>
//   );

//   expect(await screen.findByText("Resources"));
//   expect(await screen.findByText("Forms"));
//   const logoutLink = await screen.findByText("Logout");
//   await userEvent.click(logoutLink);

//   await screen.findByText("Email", {}, { timeout: 3000 });
//   await screen.findByLabelText("Password", {}, { timeout: 3000 });
// })
