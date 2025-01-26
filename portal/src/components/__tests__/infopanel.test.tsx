import {afterAll, beforeAll, beforeEach, expect, test} from 'vitest';
import {render, screen, waitFor} from "@testing-library/react";
import {FormioProvider} from "@formio/react";
import {userEvent} from "@testing-library/user-event";
import {http, HttpResponse} from "msw";
import {Formio} from "@formio/js";
import {InfoPanelProvider} from "../../hooks/useInfoPanelContext";
import App from "../App";
import {setupServer} from "msw/node";

const server = setupServer(
    http.get('http://localhost:3002/form', () => {
        return HttpResponse.json([]);
    }),
    http.get('http://localhost:3002/current', () => {
        return HttpResponse.json({});
    })
)

beforeAll(() => {
    server.listen();
})

beforeEach(() => {
    localStorage.clear();
    Formio.tokens = {};
    server.resetHandlers();
})

//TODO Having issues with the info panel always having display property as block

test('Home screen info panel isn\'t visible when first logging in', async () => {
    localStorage.setItem('formioToken', '12345');
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );

    await waitFor(() => {
        const panelElement: HTMLElement = document.querySelector('div.panel-wrap.context')!;
        expect(window.getComputedStyle(panelElement).display).to.equal('none');
    });
})

test('Home screen info panel is visible when clicked and is not visible when clicked again', async () => {
    localStorage.setItem('formioToken', '12345');
    render(
        <FormioProvider baseUrl='http://localhost:3002'>
            <InfoPanelProvider>
                <App/>
            </InfoPanelProvider>
        </FormioProvider>
    );
    const infoPanel = await screen.findByText('Info Panel', {exact: false});
    await userEvent.click(infoPanel);
    await waitFor(() => {
        const panelElement: HTMLElement = document.querySelector('div.panel-wrap.context')!;
        expect(window.getComputedStyle(panelElement).display).to.equal('block');
    });
    await userEvent.click(infoPanel, {});
    await waitFor(() => {
        const panelElement: HTMLElement = document.querySelector('div.panel-wrap.context')!;
        expect(window.getComputedStyle(panelElement).display).to.equal('none');
    });
})

afterAll(() => {
    server.close();
})
