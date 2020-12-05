#! /opt/anaconda3/bin/python
# !!!! CHANGE path to your python installation

import hashlib
import urllib.parse
import base64
import os
import requests
import json
import ssl
import websocket


#############################
# Generating an auth string #
#############################

# !!!! CHANGE THESE THREE
username = 'xxx'
password = 'xxx'
koala    = 'xxx'

# !!!! CHANGE THIS TOO
# !!!! You will want to chanage:
# !!!! - the "1" to the ID of the node (Coviva device) that you want to update (from the output of GET:all)
# !!!! - the "5" to the ID of the attribute of that node with the required attribute type (from the output of GET:all)
# !!!! - the "50" to the desired value (within the minimum and maxiumum values for that attribute from the output of GET:all)
cmd = 'PUT:nodes/1/attributes/5?target_value=50'

# !!!! The above command assumes that the node ID of the device you want (from GET:nodes or GET:all) is "1"
# !!!! And the attribute ID you want (with the desired attribute type) is "4"
# !!!! And the desired value for that attribute is "50"

device_hardware_id = '850a40f2ba21fec8567a3769263d1c5c'

user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15'

#print('Username:           ' + username)
#print('Password:           ' + password)

username_encoded = urllib.parse.quote(username, safe='~()*!.\'')
#print('Username encoded:   ' + username_encoded)

h = hashlib.sha512(password.encode('utf-8'))
password_sha512 = h.hexdigest()

#print('Password SHA-512:   ' + password_sha512)

new_decoded = username_encoded + ':' + password_sha512

#print('New Decoded:        ' + new_decoded)

new_encoded_bytes = new_decoded.encode('ascii')
base64_bytes      = base64.b64encode(new_encoded_bytes)
new_encoded       = base64_bytes.decode('ascii')

#print('New Encoded:        ' + new_encoded)

basic_auth = 'Basic ' + new_encoded;
#print('Basic Auth:         ' + basic_auth)

#pid = str(os.getpid())
#print('PID:                ' + pid)
#device_hardware_id = hashlib.md5(pid.encode()).hexdigest()

#print('device_hardware_id: ' + device_hardware_id)


#############################
# 3. Get token              #
#############################

print('Getting access token')

url = 'https://' + koala + '.koalabox.net/access_token'
headers = {
    'Host': koala + '.koalabox.net',
    'Origin': 'http://mycoviva.net',
    'Accept-Language': 'en-au',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': user_agent,
    'Authorization': basic_auth,
    'Referer': 'http://mycoviva.net'
}
payload = {
    'device_hardware_id': device_hardware_id,
    'device_name': 'Web%20App%20%7C%20Safari',
    'device_type': '4',
    'device_os':   '6',
    'device_app':  '4'
}
response3 = requests.post(
    url,
    data=payload,
    headers=headers
)
#print(response3.status_code)
ascii_content = response3.content.decode('ascii')
#print(ascii_content)

fields_and_values = ascii_content.split('&')
#print(fields_and_values)

access_token = ''
myhagerid    = ''
user_id      = ''
device_id    = ''
expires      = ''

for item in fields_and_values:
    (key, value) = item.split('=')
    if   (key == 'access_token'): access_token = value
    elif (key == 'myhagerid'):    myhagerid    = value
    elif (key == 'user_id'):      user_id      = value
    elif (key == 'device_id'):    device_id    = value
    elif (key == 'expires'):      expires      = value

#print('access_token: ' + access_token)
#print('myhagerid:    ' + myhagerid)
#print('user_id:      ' + user_id)
#print('device_id:    ' + device_id)
#print('expires:      ' + expires)


#############################
# 4. Open WebSocket         #
#############################

uri = 'wss://' + koala + '.koalabox.net/connection?access_token=' + access_token

#websocket.enableTrace(True)

#ws = websocket.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE})
ws = websocket.WebSocket()

ws.connect(uri,
    subprotocols = ['v2'],
)

ws.settimeout(30)

print('Sending: %s' % cmd)
ws.send(cmd)
print('Sent')
print('Receiving...')
result = ws.recv()
print("Received: '%s'" % result)

ws.close()

