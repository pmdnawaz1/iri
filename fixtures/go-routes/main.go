// Go router routes (TSPEC-A021 parity): chi/gin/echo style r.GET / r.POST.
package main

func register(r Router) {
	r.POST("/login", loginHandler)
	r.GET("/webhooks", listWebhooks)
}

func loginHandler() {}
func listWebhooks() {}
