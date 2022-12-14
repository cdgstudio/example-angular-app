import { Directive, Injector, Input, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { isStatefullWidget, WIDGET_ID, WidgetStateInterface, WIDGET_COMPONENT } from '@cdgstudio/dashboard';
import { WidgetLoaderService } from '@cdgstudio/dashboard/loader';
import { defaultIfEmpty, distinctUntilKeyChanged, filter, map, of, ReplaySubject, switchMap, tap } from 'rxjs';

const WIDGET_LOADERS = [
  {
    type: 'weather',
    loadWidgetModule: () => import('../widgets/weather-widget').then((m) => m.WeatherWidgetModule),
  },
  {
    type: 'github-stars',
    loadWidgetModule: () => import('../widgets/github-stars-widget').then((m) => m.GithubStarsWidgetModule),
  },
  {
    type: 'yt-statistics',
    loadWidgetModule: () => import('../widgets/yt-channel-statistics').then((m) => m.YtChannelStatisticsModule),
  },
];

@Directive({
  selector: '[appWidgetLoader]',
})
export class WidgetLoaderDirective implements OnInit, OnDestroy {
  @Input() set appWidgetLoader(widgetData: WidgetStateInterface) {
    this.widgetData$$.next(widgetData);
  }

  private widgetData$$ = new ReplaySubject<WidgetStateInterface>(1);

  constructor(
    private viewContainer: ViewContainerRef,
    private widgetLoaderService: WidgetLoaderService,
    private injector: Injector,
  ) {}

  ngOnInit(): void {
    this.widgetData$$
      .pipe(
        distinctUntilKeyChanged('id'),
        switchMap((widgetData) =>
          of(widgetData).pipe(
            map((widgetData) => WIDGET_LOADERS.find((loader) => loader.type === widgetData.type)),
            filter(Boolean),
            switchMap((loader) => this.widgetLoaderService.loadModuleAsync(loader.loadWidgetModule)),
            map((ngModuleRef) => [widgetData, ngModuleRef] as const),
          ),
        ),
        map(([widgetData, ngModuleRef]) => {
          const injector = Injector.create({
            parent: this.injector,
            providers: [{ provide: WIDGET_ID, useValue: widgetData.id }],
          });
          const WidgetComponent = ngModuleRef.injector.get(WIDGET_COMPONENT);

          this.viewContainer.clear();
          const widgetRef = this.viewContainer.createComponent(WidgetComponent, { ngModuleRef, injector });

          return [widgetData, widgetRef] as const;
        }),
        switchMap(([widgetData, componentRef]) => {
          const widget = componentRef.instance;
          if (!isStatefullWidget(widget)) {
            return of(componentRef);
          }
          return widget.setState(widgetData.data).pipe(
            map(() => componentRef),
            defaultIfEmpty(componentRef),
          );
        }),
        tap((componentRef) => componentRef.changeDetectorRef.markForCheck()),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.widgetData$$.complete();
  }
}
