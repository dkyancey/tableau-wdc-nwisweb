#!/usr/bin/perl
# ====================================================================
# @(#)  process get_parm_nm.cgi - CGI script
# ====================================================================
# Written by: David Yancey                                 15 Jan 2017
# $Id: get_parm_nm.cgi,v 1.0 2017/15/08 14:26:30 dkyancey Exp $
# --------------------------------------------------------------------
# Return name for parameter code.
#
# see also: 
# https://nwisdata.usgs.gov/service/data/view/parameters/json
# https://sites.google.com/a/usgs.gov/nwis-time-series/home/nwis-connections#TOC-NWIS-AQUARIUS-Parameter-Map

use strict;
use JSON qw( decode_json );
use Env;
use LWP::Simple;
use Data::Dumper;

my $svcurl='https://nwistsutils.nwis.usgs.gov/cgi-bin/nwis-ra.cgi?https://reporting.nwis.usgs.gov/ws/service/data/view/parameters/json?parameters.parm_alias_cd=AQNAME';	# timeseries only
#my $svcurl='https://nwistsutils.nwis.usgs.gov/cgi-bin/nwis-ra.cgi?https://reporting.nwis.usgs.gov/ws/service/data/view/parameters/json?parameters.parm_alias_cd=AQNAME';	# all
my $description = 'false';

# output ---------------------------------------------------------------------------------------
if ($ARGV[0] =~ /js/) {
	print qq~parmcode=new Array();
parmunits=new Array();
parmcode['p01h_va']='1 hour';
parmcode['p02h_va']='2 hours';
parmcode['p04h_va']='4 hours';
parmcode['p06h_va']='6 hours';
parmcode['p12h_va']='12 hours';
parmcode['p24h_va']='24 hours';
parmcode['p36h_va']='36 hours';
parmcode['p07d_va']='7 days';
parmcode['p28d_va']='28 days';
parmcode['00045:p01h_va']='1 hour';
parmcode['00045:p02h_va']='2 hours';
parmcode['00045:p04h_va']='4 hours';
parmcode['00045:p06h_va']='6 hours';
parmcode['00045:p12h_va']='12 hours';
parmcode['00045:p24h_va']='24 hours';
parmcode['00045:p36h_va']='36 hours';
parmcode['00045:p07d_va']='7 days';
parmcode['00045:p28d_va']='28 days';
~;
} elsif ($ARGV[0] =~ /pl/) {
	print qq~\$PARM{'86400'}="Daily";
\$PARM{'3600'} ="Hourly";
\$PARM{'p01h_va'}='Total precipitation in 1 hour (in)';
\$PARM{'p02h_va'}='Total precipitation in 2 hours (in)';
\$PARM{'p04h_va'}='Total precipitation in 4 hours (in)';
\$PARM{'p06h_va'}='Total precipitation in 6 hours (in)';
\$PARM{'p12h_va'}='Total precipitation in 12 hours (in)';
\$PARM{'p24h_va'}='Total precipitation in 24 hours (in)';
\$PARM{'p36h_va'}='Total precipitation in 36 hours (in)';
\$PARM{'p07d_va'}='Total precipitation in 7 days (in)';
\$PARM{'p28d_va'}='Total precipitation in 28 days (in)';
\$PARM{'00045:p01h_va'}='Total precipitation in 1 hour (in)';
\$PARM{'00045:p02h_va'}='Total precipitation in 2 hours (in)';
\$PARM{'00045:p04h_va'}='Total precipitation in 4 hours (in)';
\$PARM{'00045:p06h_va'}='Total precipitation in 6 hours (in)';
\$PARM{'00045:p12h_va'}='Total precipitation in 12 hours (in)';
\$PARM{'00045:p24h_va'}='Total precipitation in 24 hours (in)';
\$PARM{'00045:p36h_va'}='Total precipitation in 36 hours (in)';
\$PARM{'00045:p07d_va'}='Total precipitation in 7 days (in)';
\$PARM{'00045:p28d_va'}='Total precipitation in 28 days (in)';
~;
} else {
	die "Usage: $0 <js | pl>\n";
}


my $parmnm = my $parmds = my $parmunttx = my $parmcd = '';
my $json = get("$svcurl") or die "$!\n$svcurl";
my $decoded = decode_json($json);
#print  Dumper($decoded);
my @records = @{$decoded->{'records'}} or die "$!";
if ($#records >= 0) {
	for (my $i=0;$i<=$#records;$i++) {
		if ($ARGV[0] =~ /js/) {
			print "parmcode['$records[$i]->{PARM_CD}']=";
			if ( $description eq 'true' ) {
				print "'$records[$i]->{PARM_DS}';\n" ;
			} else {
				print "'$records[$i]->{PARM_NM}';\n" ;
			}
			print "parmunits['$records[$i]->{PARM_CD}']='$records[$i]->{PARM_UNT_TX}';\n" ;

		} elsif ($ARGV[0] =~ /pl/) {
			print "\$PARM{'$records[$i]->{PARM_CD}'}=";
			if ( $description eq 'true' ) {
				print "'$records[$i]->{PARM_DS} ($records[$i]->{PARM_UNT_TX})';\n" ;
			} else {
				print "'$records[$i]->{PARM_NM} ($records[$i]->{PARM_UNT_TX})';\n" ;
			}
		}

	}
}

__END__
