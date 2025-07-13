import os
import requests

# Instructions:
# 1. Register an app in Azure AD and grant it the following permissions:
#    - IdentityRiskyServicePrincipal.Read.All (for risky apps)
#    - Application.Read.All (for publisher verified apps)
# 2. Set the following environment variables:
#    AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
# 3. Run: python update_oauth_lists.py

TENANT_ID = os.getenv('AZURE_TENANT_ID')
CLIENT_ID = os.getenv('AZURE_CLIENT_ID')
CLIENT_SECRET = os.getenv('AZURE_CLIENT_SECRET')

if not (TENANT_ID and CLIENT_ID and CLIENT_SECRET):
    print("Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET.")
    exit(1)

def get_access_token():
    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'scope': 'https://graph.microsoft.com/.default'
    }
    resp = requests.post(url, data=data)
    resp.raise_for_status()
    return resp.json()['access_token']

def update_blacklist(token):
    url = "https://graph.microsoft.com/v1.0/identityProtection/riskyServicePrincipals"
    headers = {"Authorization": f"Bearer {token}"}
    apps = set()
    print("Fetching risky (blacklist) apps from Microsoft Graph...")
    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        for app in data.get('value', []):
            name = app.get('displayName')
            if name:
                apps.add(name.lower())
        url = data.get('@odata.nextLink')
    with open('oauth_blacklist.txt', 'w', encoding='utf-8') as f:
        for name in sorted(apps):
            f.write(name + '\n')
    print(f"Updated oauth_blacklist.txt with {len(apps)} entries.")

def update_whitelist(token):
    url = "https://graph.microsoft.com/v1.0/applications?$filter=publisherDomain eq 'verified'"
    headers = {"Authorization": f"Bearer {token}"}
    apps = set()
    print("Fetching publisher verified (whitelist) apps from Microsoft Graph...")
    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        for app in data.get('value', []):
            name = app.get('displayName')
            if name:
                apps.add(name.lower())
        url = data.get('@odata.nextLink')
    with open('oauth_whitelist.txt', 'w', encoding='utf-8') as f:
        for name in sorted(apps):
            f.write(name + '\n')
    print(f"Updated oauth_whitelist.txt with {len(apps)} entries.")

def main():
    token = get_access_token()
    update_blacklist(token)
    update_whitelist(token)
    print("Done.")

if __name__ == "__main__":
    main() 