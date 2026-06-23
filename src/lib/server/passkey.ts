/* WebAuthn passkeys (Windows Hello / Touch ID) for the single user.
   Credentials persist as a JSON array under DATA_DIR; the per-ceremony challenge
   round-trips in an httpOnly cookie (set by the route), so there's no session
   store. Password (auth.ts) still bootstraps and authorizes enrolment.
   ponytail: JSON file + fixed user; a real users table only if this grows past one person. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
	RegistrationResponseJSON,
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture
} from '@simplewebauthn/server';

const DIR = process.env.DATA_DIR ?? '.data';
const FILE = `${DIR}/passkeys.json`;
const RP_NAME = 'Syneidesis';
const USER_ID = new TextEncoder().encode('syn-user'); // single user
const USER_NAME = 'me';

interface Cred {
	id: string; // base64url credential id
	publicKey: string; // base64url
	counter: number;
	transports?: AuthenticatorTransportFuture[];
}

function load(): Cred[] {
	try {
		return JSON.parse(readFileSync(FILE, 'utf8')) as Cred[];
	} catch {
		return [];
	}
}

function save(creds: Cred[]): void {
	mkdirSync(DIR, { recursive: true });
	writeFileSync(FILE, JSON.stringify(creds));
}

export function hasPasskeys(): boolean {
	return load().length > 0;
}

export function registrationOptions(rpID: string) {
	return generateRegistrationOptions({
		rpName: RP_NAME,
		rpID,
		userName: USER_NAME,
		userID: USER_ID,
		attestationType: 'none',
		excludeCredentials: load().map((c) => ({ id: c.id, transports: c.transports })),
		// cross-platform → the passkey lands on a roaming device you carry (phone /
		// security key), NOT the shared PC's Hello whose PIN others may know.
		authenticatorSelection: {
			authenticatorAttachment: 'cross-platform',
			residentKey: 'preferred',
			userVerification: 'required'
		}
	});
}

export async function verifyRegistration(
	response: RegistrationResponseJSON,
	expectedChallenge: string,
	expectedOrigin: string,
	rpID: string
): Promise<boolean> {
	const v = await verifyRegistrationResponse({
		response,
		expectedChallenge,
		expectedOrigin,
		expectedRPID: rpID,
		requireUserVerification: true
	});
	if (!v.verified || !v.registrationInfo) return false;
	const { credential } = v.registrationInfo;
	const creds = load();
	creds.push({
		id: credential.id,
		publicKey: isoBase64URL.fromBuffer(credential.publicKey),
		counter: credential.counter,
		transports: credential.transports
	});
	save(creds);
	return true;
}

export function authenticationOptions(rpID: string) {
	return generateAuthenticationOptions({
		rpID,
		allowCredentials: load().map((c) => ({ id: c.id, transports: c.transports })),
		userVerification: 'required'
	});
}

export async function verifyAuthentication(
	response: AuthenticationResponseJSON,
	expectedChallenge: string,
	expectedOrigin: string,
	rpID: string
): Promise<boolean> {
	const creds = load();
	const cred = creds.find((c) => c.id === response.id);
	if (!cred) return false;
	const v = await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin,
		expectedRPID: rpID,
		requireUserVerification: true,
		credential: {
			id: cred.id,
			publicKey: isoBase64URL.toBuffer(cred.publicKey),
			counter: cred.counter,
			transports: cred.transports
		}
	});
	if (!v.verified) return false;
	cred.counter = v.authenticationInfo.newCounter;
	save(creds);
	return true;
}
