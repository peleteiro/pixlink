# pix.peleteiro.net — Worker custom domain

resource "cloudflare_workers_custom_domain" "pix" {
  account_id = local.cloudflare_account_id
  zone_id    = local.zone_id_peleteiro_net
  hostname   = "pix.peleteiro.net"
  service    = "pix"
}
