import {afterAll, beforeAll, beforeEach, expect, test} from 'vitest';
import {render, screen, waitFor} from "@testing-library/react";
import {FormioProvider} from "@formio/react";
import {setupServer} from 'msw/node';
import {http, HttpResponse} from "msw";
import {Formio} from "@formio/js";

import {InfoPanelProvider} from "../../hooks/useInfoPanelContext";
import App from "../App";

const server = setupServer(
    http.get('http://localhost:3002/admin/login', () => {
        return HttpResponse.json({});
    }),
    http.get('http://localhost:3002/form', () => {
        return HttpResponse.json([]);
    }),
    http.get('http://localhost:3002/current', () => {
        return HttpResponse.json({});
    })
);

beforeAll(() => {
    server.listen();
})

beforeEach(() => {
    localStorage.clear();
    Formio.tokens = {};
    server.resetHandlers();
})
test('Link to help documentation should be in the login page', async () => {
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );
    const helpDocumentationLink: HTMLAnchorElement = await screen.findByText('Form.io Help Documentation');
    expect(helpDocumentationLink).to.exist;
    expect(helpDocumentationLink.href).to.equal('https://help.form.io/');
});

test('Link to renderer documentation should be in the login page', async () => {
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );
    const rendererDocumentationLink: HTMLAnchorElement = await screen.findByText('Form.io SDK / Renderer Documentation');
    expect(rendererDocumentationLink).to.exist;
    expect(rendererDocumentationLink.href).to.equal('https://help.form.io/developers/javascript-development/javascript-sdk');
});

test('Links to contact us should be on the home page', async () => {
    localStorage.setItem('formioToken', '12345');
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );
    const contactUsLinks: HTMLAnchorElement[] = await screen.findAllByText('contact us');
    expect(contactUsLinks.length).to.equal(2);
    expect(contactUsLinks[0].href).to.equal('https://form.io/contact');
    expect(contactUsLinks[1].href).to.equal('https://form.io/contact');
});

test('Resource help icon should be on the home page', async () => {
    localStorage.setItem('formioToken', '12345');
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );
    await waitFor(() => {
        expect(document.querySelector('div.panel-wrap.resources')!.querySelector('button.help')).to.exist;
    })
});

test('Forms help icon should be on the home page', async () => {
    localStorage.setItem('formioToken', '12345');
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );
    await waitFor(() => {
        expect(document.querySelector('div.panel-wrap.forms')!.querySelector('button.help')).to.exist;
    });
});


afterAll(() => {
    server.close();
});
