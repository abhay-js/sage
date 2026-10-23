"""Authenticated experimental Garmin API; never logs bodies or credentials."""
from http.server import BaseHTTPRequestHandler
import json
from garminbridge.service import ApiError, Bridge

ORIGIN = 'https://sage-secure-mvp-source.vercel.app'


class handler(BaseHTTPRequestHandler):
    def log_message(self,*args):
        pass

    def reply(self,status,data):
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('Access-Control-Allow-Origin',ORIGIN)
        self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type')
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.reply(200,{})

    def do_GET(self):
        self.process('status',{})

    def do_POST(self):
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=8192:
                raise ValueError()
            body=json.loads(self.rfile.read(size))
            if not isinstance(body,dict):
                raise ValueError()
        except (ValueError,json.JSONDecodeError):
            return self.reply(400,{'error':'Invalid Garmin request.'})
        self.process(body.pop('action',None),body)

    def process(self,action,body):
        bearer=self.headers.get('Authorization','')
        if not bearer.startswith('Bearer '):
            return self.reply(401,{'error':'Sign in to Sage first.'})
        try:
            self.reply(200,Bridge().handle(bearer[7:],action,body))
        except ApiError as error:
            self.reply(error.code,{'error':error.message})
        except Exception:
            self.reply(502,{'error':'Garmin could not complete this request. Try later or use Apple Health/FIT upload.'})
